import assert                              from 'node:assert/strict'
import { mkdir }                           from 'node:fs/promises'
import { mkdtemp }                         from 'node:fs/promises'
import { readFile }                        from 'node:fs/promises'
import { rm }                              from 'node:fs/promises'
import { writeFile }                       from 'node:fs/promises'
import { tmpdir }                          from 'node:os'
import { join }                            from 'node:path'
import test                                from 'node:test'
import { fileURLToPath }                   from 'node:url'
import { pathToFileURL }                   from 'node:url'

import { createRuntimeExecArgv }           from './runtime-exec-argv.js'
import { createTypeScriptRuntimeExecArgv } from './runtime-exec-argv.js'
import { resolveTypeScriptLoader }         from './runtime-exec-argv.js'

test('should create TypeScript runtime exec argv without PnP loader', () => {
  assert.deepEqual(createTypeScriptRuntimeExecArgv(undefined), [
    '--loader',
    '@atls/raijin/typescript-loader',
    '--enable-source-maps',
  ])
})

test('should keep PnP loader before TypeScript runtime loader', () => {
  assert.deepEqual(
    createTypeScriptRuntimeExecArgv(
      'file:///repo/.pnp.loader.mjs',
      'file:///runtime/typescript-loader.js'
    ),
    [
      '--loader',
      'file:///repo/.pnp.loader.mjs',
      '--loader',
      'file:///runtime/typescript-loader.js',
      '--enable-source-maps',
    ]
  )
})

test('should resolve TypeScript loader to loadable JavaScript', async () => {
  const typeScriptLoader = await resolveTypeScriptLoader()
  const typeScriptLoaderPath = fileURLToPath(typeScriptLoader)
  const typeScriptLoaderModule = await import(`${typeScriptLoader}?runtime-exec-argv`)

  assert.ok(
    typeScriptLoaderPath.endsWith(join('dist', 'runtime', 'typescript-loader.js')) ||
      typeScriptLoaderPath.endsWith('typescript-loader.mjs')
  )
  assert.equal(typeof typeScriptLoaderModule.load, 'function')
})

test('should materialize source-only TypeScript loader to JavaScript', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'runtime-exec-argv-loader-'))
  const sourceDir = join(workspace, 'src', 'runtime')
  const packageJsonPath = join(workspace, 'package.json')

  try {
    await mkdir(sourceDir, { recursive: true })
    await writeFile(packageJsonPath, JSON.stringify({ type: 'module' }), 'utf8')
    await writeFile(
      join(sourceDir, 'typescript-loader.ts'),
      `
        import type { LoadHook } from 'node:module'
        import { createRequire } from 'node:module'

        const require = createRequire(import.meta.url)

        export const resolvedPath = require.resolve('node:path')
        export const load: LoadHook = () => ({ format: 'module', shortCircuit: true, source: 'export {}' })
      `,
      'utf8'
    )

    const typeScriptLoader = await resolveTypeScriptLoader(packageJsonPath)
    const typeScriptLoaderPath = fileURLToPath(typeScriptLoader)
    const typeScriptLoaderSource = await readFile(typeScriptLoaderPath, 'utf8')
    const typeScriptLoaderModule = await import(`${typeScriptLoader}?source-only-runtime`)

    assert.ok(typeScriptLoaderPath.endsWith('typescript-loader.mjs'))
    assert.match(typeScriptLoaderSource, /package\.json/)
    assert.equal(typeScriptLoaderModule.resolvedPath, 'node:path')
    assert.equal(typeof typeScriptLoaderModule.load, 'function')
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test('should reject Raijin package without loadable TypeScript loader', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'runtime-exec-argv-loader-'))
  const packageJsonPath = join(workspace, 'package.json')

  try {
    await writeFile(packageJsonPath, JSON.stringify({ type: 'module' }), 'utf8')

    await assert.rejects(
      resolveTypeScriptLoader(packageJsonPath),
      /Unable to resolve loadable TypeScript loader/
    )
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test('should resolve PnP loader from parent project root', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'runtime-exec-argv-'))
  const nestedWorkspace = join(workspace, 'backend', 'wallet', 'service')
  const pnpEsmLoaderPath = join(workspace, '.pnp.loader.mjs')
  const typeScriptLoader = await resolveTypeScriptLoader()

  await mkdir(nestedWorkspace, { recursive: true })
  await writeFile(pnpEsmLoaderPath, '')

  try {
    assert.deepEqual(await createRuntimeExecArgv(nestedWorkspace), [
      '--loader',
      pathToFileURL(pnpEsmLoaderPath).href,
      '--loader',
      typeScriptLoader,
      '--enable-source-maps',
    ])
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})
