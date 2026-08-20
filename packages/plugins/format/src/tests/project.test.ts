import assert                     from 'node:assert/strict'
import { mkdtemp }                from 'node:fs/promises'
import { mkdir }                  from 'node:fs/promises'
import { readFile }               from 'node:fs/promises'
import { stat }                   from 'node:fs/promises'
import { utimes }                 from 'node:fs/promises'
import { writeFile }              from 'node:fs/promises'
import { tmpdir }                 from 'node:os'
import { join }                   from 'node:path'
import { test }                   from 'node:test'

import { createCommandInput }     from '@atls/raijin/commands'
import { toPortableCwd }          from '@atls/raijin/commands'

import { TargetMissingException } from '../exceptions/target-missing.js'
import { formatProjectSources }   from '../project.js'

const createProject = async (): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-format-project-'))

  await writeFile(
    join(cwd, 'package.json'),
    `${JSON.stringify({ private: true, formatterIgnorePatterns: ['ignored.ts'] })}\n`
  )

  return cwd
}

const createTargets = (cwd: string, targets: Array<string>) =>
  createCommandInput({ cwd: toPortableCwd(cwd), source: 'explicit', targets })

test('should format literal and duplicate targets once while keeping ignored files untouched', async () => {
  const cwd = await createProject()
  const sourceDirectory = join(cwd, 'src/[id]')
  const sourceFile = join(sourceDirectory, 'index.ts')
  const ignoredFile = join(cwd, 'ignored.ts')

  await mkdir(sourceDirectory, { recursive: true })
  await writeFile(sourceFile, 'const value={foo:1}\n')
  await writeFile(ignoredFile, 'const ignored={value:1}\n')

  const targets = createTargets(cwd, ['src/[id]', 'src/[id]/index.ts', 'ignored.ts'])

  assert.deepEqual(await formatProjectSources({ cwd, targets }), {
    files: [{ file: 'src/[id]/index.ts', status: 'changed' }],
  })
  assert.equal(await readFile(sourceFile, 'utf8'), 'const value = { foo: 1 }\n')
  assert.equal(await readFile(ignoredFile, 'utf8'), 'const ignored={value:1}\n')

  const unchangedModificationTime = new Date('2020-01-01T00:00:00.000Z')

  await utimes(sourceFile, unchangedModificationTime, unchangedModificationTime)
  assert.deepEqual(await formatProjectSources({ cwd, targets }), {
    files: [{ file: 'src/[id]/index.ts', status: 'unchanged' }],
  })
  assert.equal((await stat(sourceFile)).mtimeMs, unchangedModificationTime.getTime())
})

test('should use project Prettier configuration for targetless formatting', async () => {
  const cwd = await createProject()
  const sourceFile = join(cwd, 'index.ts')

  await writeFile(join(cwd, '.prettierrc.mjs'), 'export default { semi: false }\n')
  await writeFile(sourceFile, 'const value={foo:1};\n')

  assert.deepEqual(await formatProjectSources({ cwd }), {
    files: [
      { file: '.prettierrc.mjs', status: 'unchanged' },
      { file: 'index.ts', status: 'changed' },
      { file: 'package.json', status: 'changed' },
    ],
  })
  assert.equal(await readFile(sourceFile, 'utf8'), 'const value = { foo: 1 }\n')
})

test('should reject missing explicit targets', async () => {
  const cwd = await createProject()
  const laterTarget = join(cwd, 'later.ts')

  await writeFile(laterTarget, 'const later={value:1}\n')

  await assert.rejects(
    formatProjectSources({ cwd, targets: createTargets(cwd, ['missing-first', 'later.ts']) }),
    new TargetMissingException('missing-first')
  )
  assert.equal(await readFile(laterTarget, 'utf8'), 'const later={value:1}\n')
})
