import assert           from 'node:assert/strict'
import { mkdir }        from 'node:fs/promises'
import { mkdtemp }      from 'node:fs/promises'
import { readFile }     from 'node:fs/promises'
import { readdir }      from 'node:fs/promises'
import { rm }           from 'node:fs/promises'
import { writeFile }    from 'node:fs/promises'
import { tmpdir }       from 'node:os'
import { join }         from 'node:path'
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

test('emits one complete artifact with native TypeScript extension rewriting', async (t) => {
  const cwd = await createProject(
    {
      'src/common.cts': 'export const commonValue = true\n',
      'src/index.ts': [
        "import './value.ts'",
        "import './view.tsx'",
        "import './module.mts'",
        "import './common.cts'",
        "export { legacy } from './legacy.jsx'",
        'export const value = true',
        '',
      ].join('\n'),
      'src/legacy.tsx': 'export const legacy = true\n',
      'src/module.mts': 'export const moduleValue = true\n',
      'src/value.ts': 'export const value = true\n',
      'src/view.tsx': 'export const view = true\n',
    },
    { declarationMap: true, sourceMap: true }
  )

  t.after(async () => rm(cwd, { force: true, recursive: true }))

  const result = await build(cwd)

  assert.equal(result.kind, 'completed')
  if (result.kind !== 'completed') return

  const output = await readFile(join(cwd, 'dist/index.js'), 'utf8')

  assert.match(output, /['"]\.\/value\.js['"]/)
  assert.match(output, /['"]\.\/view\.js['"]/)
  assert.match(output, /['"]\.\/module\.mjs['"]/)
  assert.match(output, /['"]\.\/common\.cjs['"]/)
  assert.match(output, /['"]\.\/legacy\.js['"]/)
  assert.doesNotMatch(output, /\.(?:cts|jsx|mts|ts|tsx)['"]/)
  assert.equal(result.diagnostics.length, 0)
  assert.ok(result.artifact.javascript.every((path) => path.startsWith(join(cwd, 'dist'))))
  assert.ok(result.artifact.declarations.some((path) => path.endsWith('/index.d.ts')))
  assert.ok(result.artifact.sourceMaps.some((path) => path.endsWith('/index.js.map')))
  assert.ok(result.artifact.sourceMaps.some((path) => path.endsWith('/index.d.ts.map')))
  assert.deepEqual(await readStagingDirectories(cwd), [])
})

test('preserves relative jsx specifiers when TypeScript emits jsx files', async (t) => {
  const cwd = await createProject(
    {
      'src/index.ts': "export { view } from './view.jsx'\n",
      'src/view.tsx': 'export const view = true\n',
    },
    { jsx: 'preserve' }
  )

  t.after(async () => rm(cwd, { force: true, recursive: true }))

  const result = await build(cwd)

  assert.equal(result.kind, 'completed')
  assert.match(await readFile(join(cwd, 'dist/index.js'), 'utf8'), /['"]\.\/view\.jsx['"]/)
  await readFile(join(cwd, 'dist/view.jsx'), 'utf8')
})

test('loads TypeScript providers from the direct workspace boundary', async (t) => {
  const cwd = await createProject({ 'src/index.ts': 'export const value = true\n' })
  const raijinCwd = join(cwd, 'node_modules/@atls/raijin')

  t.after(async () => rm(cwd, { force: true, recursive: true }))

  await writeFile(
    join(cwd, 'package.json'),
    JSON.stringify({
      name: 'fixture',
      type: 'module',
      devDependencies: { '@atls/raijin': '1.0.0' },
    })
  )
  await mkdir(raijinCwd, { recursive: true })
  await writeFile(
    join(raijinCwd, 'package.json'),
    JSON.stringify({
      name: '@atls/raijin',
      type: 'module',
      exports: {
        './config/typescript': './config-typescript.js',
        './typescript': './typescript.js',
      },
    })
  )
  await writeFile(
    join(raijinCwd, 'config-typescript.js'),
    [
      'export const resolveTypeScriptProject = ({ typescript }) => {',
      "  if (typescript.provider !== 'workspace') throw new Error('unexpected TypeScript runtime')",
      "  throw new Error('workspace TypeScript providers loaded')",
      '}',
      '',
    ].join('\n')
  )
  await writeFile(join(raijinCwd, 'typescript.js'), "export const ts = { provider: 'workspace' }\n")

  await assert.rejects(build(cwd), /workspace TypeScript providers loaded/u)
  assert.deepEqual(await readStagingDirectories(cwd), [])
})

test('preserves the previous artifact when compilation fails', async (t) => {
  const cwd = await createProject({ 'src/index.ts': 'export const value = true\n' })

  t.after(async () => rm(cwd, { force: true, recursive: true }))

  const completed = await build(cwd)

  assert.equal(completed.kind, 'completed')

  const previous = await readFile(join(cwd, 'dist/index.js'), 'utf8')

  await writeFile(join(cwd, 'src/index.ts'), 'export const value: string = 1\n')

  const failed = await build(cwd)

  assert.equal(failed.kind, 'compilation-failed')
  assert.equal(await readFile(join(cwd, 'dist/index.js'), 'utf8'), previous)
  assert.deepEqual(await readStagingDirectories(cwd), [])
})

test('preserves the previous artifact when emitted output is incomplete', async (t) => {
  const cwd = await createProject({ 'src/types.d.ts': 'export declare const value: true\n' })
  const targetRoot = join(cwd, 'dist')

  t.after(async () => rm(cwd, { force: true, recursive: true }))

  await mkdir(targetRoot)
  await writeFile(join(targetRoot, 'previous.txt'), 'previous\n')

  const result = await build(cwd)

  assert.equal(result.kind, 'artifact-invalid')
  if (result.kind === 'artifact-invalid') {
    assert.deepEqual(result.issues, ['javascript-missing', 'declarations-missing'])
  }
  assert.equal(await readFile(join(targetRoot, 'previous.txt'), 'utf8'), 'previous\n')
  assert.deepEqual(await readStagingDirectories(cwd), [])
})
