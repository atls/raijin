import assert                     from 'node:assert/strict'
import { mkdtemp }                from 'node:fs/promises'
import { mkdir }                  from 'node:fs/promises'
import { readFile }               from 'node:fs/promises'
import { rm }                     from 'node:fs/promises'
import { stat }                   from 'node:fs/promises'
import { utimes }                 from 'node:fs/promises'
import { writeFile }              from 'node:fs/promises'
import { tmpdir }                 from 'node:os'
import { join }                   from 'node:path'
import { test }                   from 'node:test'
import { fileURLToPath }          from 'node:url'

import { createCommandInput }     from '@atls/raijin/commands'
import { toPortableCwd }          from '@atls/raijin/commands'

import { TargetMissingException } from '../exceptions/target-missing.js'
import { formatProjectSources }   from '../project.js'

const moduleDirectory = fileURLToPath(new URL('.', import.meta.url))

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
    files: [{ file: join('src', '[id]', 'index.ts'), status: 'changed' }],
  })
  assert.equal(await readFile(sourceFile, 'utf8'), 'const value = { foo: 1 }\n')
  assert.equal(await readFile(ignoredFile, 'utf8'), 'const ignored={value:1}\n')

  const unchangedModificationTime = new Date('2020-01-01T00:00:00.000Z')

  await utimes(sourceFile, unchangedModificationTime, unchangedModificationTime)
  assert.deepEqual(await formatProjectSources({ cwd, targets }), {
    files: [{ file: join('src', '[id]', 'index.ts'), status: 'unchanged' }],
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

test('should leave root and nested gitignored files untouched for explicit and project formatting', async (t) => {
  const cwd = await createProject()
  const appDirectory = join(cwd, 'apps/web')
  const siblingDirectory = join(cwd, 'apps/other')
  const generatedFile = join(cwd, 'generated.ts')
  const nextTypes = join(appDirectory, 'next-env.d.ts')
  const handwrittenTypes = join(appDirectory, 'new-types.d.ts')
  const siblingTypes = join(siblingDirectory, 'next-env.d.ts')

  t.after(async () => rm(cwd, { recursive: true, force: true }))
  await mkdir(appDirectory, { recursive: true })
  await mkdir(siblingDirectory, { recursive: true })
  await writeFile(join(cwd, '.gitignore'), 'generated.ts\n')
  await writeFile(join(appDirectory, '.gitignore'), 'next-env.d.ts\n')
  await writeFile(generatedFile, 'const generated={value:1}\n')
  await writeFile(nextTypes, 'export declare const generated :number\n')
  await writeFile(handwrittenTypes, 'export declare const handwritten :number\n')
  await writeFile(siblingTypes, 'export declare const sibling :number\n')

  const targets = createTargets(cwd, [
    'generated.ts',
    'apps/web/next-env.d.ts',
    'apps/web/new-types.d.ts',
    'apps/other/next-env.d.ts',
  ])

  assert.deepEqual(await formatProjectSources({ cwd, targets }), {
    files: [
      { file: join('apps', 'web', 'new-types.d.ts'), status: 'changed' },
      { file: join('apps', 'other', 'next-env.d.ts'), status: 'changed' },
    ],
  })
  assert.equal(await readFile(generatedFile, 'utf8'), 'const generated={value:1}\n')
  assert.equal(await readFile(nextTypes, 'utf8'), 'export declare const generated :number\n')
  assert.equal(
    await readFile(handwrittenTypes, 'utf8'),
    'export declare const handwritten: number\n'
  )

  const projectFiles = (await formatProjectSources({ cwd, write: false })).files.map(
    ({ file }) => file
  )

  assert.equal(projectFiles.includes('generated.ts'), false)
  assert.equal(projectFiles.includes(join('apps', 'web', 'next-env.d.ts')), false)
  assert.equal(projectFiles.includes(join('apps', 'web', 'new-types.d.ts')), true)
  assert.equal(projectFiles.includes(join('apps', 'other', 'next-env.d.ts')), true)
})

test('should honor nested gitignore negation without reentering an ignored parent directory', async (t) => {
  const cwd = await createProject()
  const appDirectory = join(cwd, 'apps/web')
  const blockedDirectory = join(cwd, 'blocked')
  const restoredFile = join(appDirectory, 'restored.d.ts')
  const ignoredFile = join(appDirectory, 'ignored.d.ts')
  const blockedFile = join(blockedDirectory, 'restored.d.ts')

  t.after(async () => rm(cwd, { recursive: true, force: true }))
  await mkdir(appDirectory, { recursive: true })
  await mkdir(blockedDirectory, { recursive: true })
  await writeFile(join(cwd, '.gitignore'), 'apps/web/*.d.ts\nblocked/\n')
  await writeFile(join(appDirectory, '.gitignore'), '!restored.d.ts\n')
  await writeFile(join(blockedDirectory, '.gitignore'), '!restored.d.ts\n')
  await writeFile(restoredFile, 'export declare const restored :number\n')
  await writeFile(ignoredFile, 'export declare const ignored :number\n')
  await writeFile(blockedFile, 'export declare const blocked :number\n')

  assert.deepEqual(
    await formatProjectSources({
      cwd,
      targets: createTargets(cwd, [
        'apps/web/restored.d.ts',
        'apps/web/ignored.d.ts',
        'blocked/restored.d.ts',
      ]),
    }),
    { files: [{ file: join('apps', 'web', 'restored.d.ts'), status: 'changed' }] }
  )
  assert.equal(await readFile(ignoredFile, 'utf8'), 'export declare const ignored :number\n')
  assert.equal(await readFile(blockedFile, 'utf8'), 'export declare const blocked :number\n')
})

test('should not format files inside a PnP-ignored independent project', async (t) => {
  const cwd = await createProject()
  const sourceDirectory = join(cwd, 'src')
  const childDirectory = join(cwd, 'client')
  const sourceFile = join(sourceDirectory, 'index.ts')
  const childFile = join(childDirectory, 'index.ts')

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  await mkdir(sourceDirectory, { recursive: true })
  await mkdir(childDirectory, { recursive: true })
  await writeFile(sourceFile, 'export const root={value:1}\n')
  await writeFile(childFile, 'export const child={value:1}\n')
  await writeFile(join(childDirectory, 'yarn.lock'), '# independent project\n')
  await writeFile(join(childDirectory, '.yarnrc.yml'), 'nodeLinker: node-modules\n')

  const pnpIgnorePatterns = ['./client/**']
  const targets = createTargets(cwd, ['src/index.ts', 'client/index.ts'])

  assert.deepEqual(await formatProjectSources({ cwd, targets, pnpIgnorePatterns }), {
    files: [{ file: join('src', 'index.ts'), status: 'changed' }],
  })
  assert.equal(await readFile(sourceFile, 'utf8'), 'export const root = { value: 1 }\n')
  assert.equal(await readFile(childFile, 'utf8'), 'export const child={value:1}\n')

  const projectFiles = (
    await formatProjectSources({ cwd, pnpIgnorePatterns, write: false })
  ).files.map(({ file }) => file)

  assert.equal(projectFiles.includes(join('client', 'index.ts')), false)
  assert.equal(projectFiles.includes(join('src', 'index.ts')), true)
})

test('should report formatter drift without writing in verification mode', async (t) => {
  const cwd = await createProject()
  const sourceFile = join(cwd, 'source.ts')
  const source = 'const value={foo:1}\n'

  t.after(async () => rm(cwd, { recursive: true, force: true }))
  await writeFile(sourceFile, source)

  const result = await formatProjectSources({
    cwd,
    targets: createTargets(cwd, ['source.ts']),
    write: false,
  })

  assert.deepEqual(result, { files: [{ file: 'source.ts', status: 'changed' }] })
  assert.equal(await readFile(sourceFile, 'utf8'), source)
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

test('should resolve a bare Prettier configuration import through project PnP', async (context) => {
  assert.ok(process.versions.pnp)

  const cwd = await mkdtemp(join(moduleDirectory, '.pnp-config-'))

  context.after(async () => rm(cwd, { recursive: true, force: true }))

  await writeFile(join(cwd, 'package.json'), '{"private":true}\n')
  await writeFile(
    join(cwd, '.prettierrc.mjs'),
    "import config from '@atls/raijin/prettier'\nexport default { ...config, semi: true, singleQuote: false }\n"
  )
  await writeFile(join(cwd, 'source.ts'), "export const value='test'\n")

  assert.deepEqual(
    await formatProjectSources({ cwd, targets: createTargets(cwd, ['source.ts']) }),
    {
      files: [{ file: 'source.ts', status: 'changed' }],
    }
  )
  assert.equal(await readFile(join(cwd, 'source.ts'), 'utf8'), 'export const value = "test";\n')
})
