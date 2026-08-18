import assert                 from 'node:assert/strict'
import { mkdtemp }            from 'node:fs/promises'
import { mkdir }              from 'node:fs/promises'
import { writeFile }          from 'node:fs/promises'
import { tmpdir }             from 'node:os'
import { join }               from 'node:path'
import { test }               from 'node:test'

import { createCommandInput } from '../../../../../../commands/index.js'
import { toPortableCwd }      from '../../../../../../commands/index.js'
import { createSourceFiles }  from '../files.js'

const createProject = async (): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-format-files-'))

  await writeFile(
    join(cwd, 'package.json'),
    `${JSON.stringify({ private: true, formatterIgnorePatterns: ['ignored.ts'] })}\n`
  )

  return cwd
}

const createInput = (cwd: string, targets: Array<string>) =>
  createCommandInput({ cwd: toPortableCwd(cwd), source: 'explicit', targets })

test('should resolve literal directory targets once and apply project ignores', async () => {
  const cwd = await createProject()
  const target = join(cwd, 'src/[id]')

  await mkdir(target, { recursive: true })
  await writeFile(join(target, 'index.ts'), 'const value=1\n')
  await writeFile(join(cwd, 'ignored.ts'), 'const ignored=1\n')

  const files = createSourceFiles(cwd)

  assert.deepEqual(await files.resolve(createInput(cwd, ['src/[id]', 'src/[id]/index.ts'])), [
    { file: 'src/[id]/index.ts', path: join(target, 'index.ts') },
  ])
  assert.deepEqual(await files.resolve(), [
    { file: 'package.json', path: join(cwd, 'package.json') },
    { file: 'src/[id]/index.ts', path: join(target, 'index.ts') },
  ])
})

test('should fail clearly when an explicit target does not exist', async () => {
  const cwd = await createProject()

  await assert.rejects(
    createSourceFiles(cwd).resolve(createInput(cwd, ['missing-first', 'missing-second'])),
    new Error('Formatter target does not exist: missing-first')
  )
})
