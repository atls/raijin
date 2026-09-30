import assert           from 'node:assert/strict'
import { mkdir }        from 'node:fs/promises'
import { mkdtemp }      from 'node:fs/promises'
import { readFile }     from 'node:fs/promises'
import { readdir }      from 'node:fs/promises'
import { rm }           from 'node:fs/promises'
import { unlink }       from 'node:fs/promises'
import { writeFile }    from 'node:fs/promises'
import { tmpdir }       from 'node:os'
import { join }         from 'node:path'
import { relative }     from 'node:path'
import { sep }          from 'node:path'
import { test }         from 'node:test'

import { buildLibrary } from '../run.js'

const createProject = async (
  files: Record<string, string>,
  compilerOptions: Record<string, unknown> = {}
): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-library-build-'))

  await writeFile(join(cwd, 'package.json'), '{"name":"fixture","type":"module"}\n')
  await writeFile(
    join(cwd, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          rootDir: 'src',
          skipLibCheck: true,
          target: 'es2022',
          ...compilerOptions,
        },
        include: ['src/**/*'],
      },
      null,
      2
    )}\n`
  )

  await Promise.all(
    Object.entries(files).map(async ([path, source]) => {
      const file = join(cwd, path)

      await mkdir(join(file, '..'), { recursive: true })
      await writeFile(file, source)
    })
  )

  return cwd
}

const build = (cwd: string) =>
  buildLibrary({ cwd, sourceRoot: join(cwd, 'src'), targetRoot: join(cwd, 'dist') })

const readStagingDirectories = async (cwd: string): Promise<Array<string>> =>
  (await readdir(cwd)).filter((name) => name.startsWith('.dist.raijin-library-'))

const artifactPaths = (targetRoot: string, paths: ReadonlyArray<string>): Array<string> =>
  paths.map((path) => relative(targetRoot, path).split(sep).join('/')).sort()

test('emits the complete artifact with native relative import rewrites', async (t) => {
  const cwd = await createProject(
    {
      'src/common.cts': 'export const commonValue = true\n',
      'src/index.ts': [
        "import './value.ts'",
        "import './view.tsx'",
        "import './module.mts'",
        "import './common.cts'",
        'export const value = true',
        '',
      ].join('\n'),
      'src/module.mts': 'export const moduleValue = true\n',
      'src/value.ts': 'export const value = true\n',
      'src/view.tsx': 'export const view = true\n',
    },
    { declarationMap: true, sourceMap: true }
  )
  const targetRoot = join(cwd, 'dist')

  t.after(async () => rm(cwd, { force: true, recursive: true }))

  const result = await build(cwd)

  assert.equal(result.kind, 'completed')
  if (result.kind !== 'completed') return

  const output = await readFile(join(targetRoot, 'index.js'), 'utf8')

  assert.match(output, /['"]\.\/value\.js['"]/u)
  assert.match(output, /['"]\.\/view\.js['"]/u)
  assert.match(output, /['"]\.\/module\.mjs['"]/u)
  assert.match(output, /['"]\.\/common\.cjs['"]/u)
  assert.doesNotMatch(output, /\.(?:cts|jsx|mts|ts|tsx)['"]/u)
  assert.deepEqual(result.diagnostics, [])
  assert.equal(result.artifact.targetRoot, targetRoot)
  assert.deepEqual(artifactPaths(targetRoot, result.artifact.javascript), [
    'common.cjs',
    'index.js',
    'module.mjs',
    'value.js',
    'view.js',
  ])
  assert.deepEqual(artifactPaths(targetRoot, result.artifact.declarations), [
    'common.d.cts',
    'index.d.ts',
    'module.d.mts',
    'value.d.ts',
    'view.d.ts',
  ])
  assert.deepEqual(artifactPaths(targetRoot, result.artifact.sourceMaps), [
    'common.cjs.map',
    'common.d.cts.map',
    'index.d.ts.map',
    'index.js.map',
    'module.d.mts.map',
    'module.mjs.map',
    'value.d.ts.map',
    'value.js.map',
    'view.d.ts.map',
    'view.js.map',
  ])
  assert.deepEqual(await readStagingDirectories(cwd), [])
})

test('uses native TypeScript rewriting when the project emits jsx files', async (t) => {
  const cwd = await createProject(
    {
      'src/index.ts': "export { view } from './view.tsx'\n",
      'src/view.tsx': 'export const view = true\n',
    },
    { jsx: 'preserve' }
  )

  t.after(async () => rm(cwd, { force: true, recursive: true }))

  const result = await build(cwd)

  assert.equal(result.kind, 'completed')
  assert.match(await readFile(join(cwd, 'dist/index.js'), 'utf8'), /['"]\.\/view\.jsx['"]/u)
  await readFile(join(cwd, 'dist/view.jsx'), 'utf8')
})

test('preserves configured and inferred project roots', async (t) => {
  const files = {
    'generated/value.ts': "export const generated = 'generated'\n",
    'src/index.ts': "export { generated } from '../generated/value.ts'\n",
  }
  const configured = await createProject(files, { rootDir: '.' })
  const inferred = await createProject(files, { rootDir: undefined })

  t.after(async () => {
    await Promise.all(
      [configured, inferred].map((cwd) => rm(cwd, { force: true, recursive: true }))
    )
  })

  assert.equal((await build(configured)).kind, 'completed')
  assert.equal((await build(inferred)).kind, 'completed')

  for (const cwd of [configured, inferred]) {
    assert.match(
      await readFile(join(cwd, 'dist/src/index.js'), 'utf8'),
      /['"]\.\.\/generated\/value\.js['"]/u
    )
    await readFile(join(cwd, 'dist/generated/value.js'), 'utf8')
  }
})

test('does not re-emit a previous artifact from an in-source target', async (t) => {
  const cwd = await createProject(
    { 'src/index.ts': 'export const value = true\n' },
    { allowJs: true }
  )
  const targetRoot = join(cwd, 'src/lib')
  const input = { cwd, sourceRoot: join(cwd, 'src'), targetRoot }

  t.after(async () => rm(cwd, { force: true, recursive: true }))

  assert.equal((await buildLibrary(input)).kind, 'completed')
  const result = await buildLibrary(input)

  assert.equal(result.kind, 'completed')
  if (result.kind !== 'completed') return
  assert.deepEqual(artifactPaths(targetRoot, result.artifact.javascript), ['index.js'])
  assert.deepEqual(artifactPaths(targetRoot, result.artifact.declarations), ['index.d.ts'])
})

test('preserves the previous complete artifact when a build fails', async (t) => {
  const cwd = await createProject({ 'src/index.ts': 'export const value = true\n' })
  const targetRoot = join(cwd, 'dist')

  t.after(async () => rm(cwd, { force: true, recursive: true }))

  assert.equal((await build(cwd)).kind, 'completed')
  const previous = await readFile(join(targetRoot, 'index.js'), 'utf8')

  await writeFile(join(cwd, 'src/index.ts'), 'export const value: string = 1\n')
  const compilationFailure = await build(cwd)

  assert.equal(compilationFailure.kind, 'compilation-failed')
  assert.equal(await readFile(join(targetRoot, 'index.js'), 'utf8'), previous)
  assert.deepEqual(await readStagingDirectories(cwd), [])

  await unlink(join(cwd, 'src/index.ts'))
  await writeFile(join(cwd, 'src/types.d.ts'), 'export declare const value: true\n')
  const verificationFailure = await build(cwd)

  assert.equal(verificationFailure.kind, 'artifact-invalid')
  assert.equal(await readFile(join(targetRoot, 'index.js'), 'utf8'), previous)
  assert.deepEqual(await readStagingDirectories(cwd), [])
})
