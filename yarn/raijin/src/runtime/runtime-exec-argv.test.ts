import assert                              from 'node:assert/strict'
import { mkdir }                           from 'node:fs/promises'
import { mkdtemp }                         from 'node:fs/promises'
import { rm }                              from 'node:fs/promises'
import { writeFile }                       from 'node:fs/promises'
import { createRequire }                   from 'node:module'
import { tmpdir }                          from 'node:os'
import { join }                            from 'node:path'
import test                                from 'node:test'
import { pathToFileURL }                   from 'node:url'

import { createRuntimeExecArgv }           from './runtime-exec-argv.js'
import { createRuntimeEnvironment }        from './runtime-exec-argv.js'
import { createTypeScriptRuntimeExecArgv } from './runtime-exec-argv.js'
import { resolveSourceTypeScriptLoader }   from './runtime-exec-argv.js'
import { resolveTypeScriptLoader }         from './runtime-exec-argv.js'

const require = createRequire(import.meta.url)

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

test('should remove managed loaders from TypeScript runtime child environment', () => {
  assert.deepEqual(
    createRuntimeEnvironment({
      NODE_OPTIONS:
        '--require /repo/.pnp.cjs --experimental-loader file:///repo/.pnp.loader.mjs --loader @atls/raijin/typescript-loader --trace-warnings --loader file:///tmp/custom-loader.mjs',
    }),
    {
      NODE_OPTIONS:
        '--require /repo/.pnp.cjs --trace-warnings --loader file:///tmp/custom-loader.mjs',
    }
  )
})

test('should keep PnP loader for plain runtime child environment', () => {
  assert.deepEqual(
    createRuntimeEnvironment(
      {
        NODE_OPTIONS:
          '--require=/repo/.pnp.cjs --experimental-loader=file:///repo/.pnp.loader.mjs --loader @atls/raijin/typescript-loader',
      },
      { preservePnpEsmLoader: true }
    ),
    {
      NODE_OPTIONS: '--require=/repo/.pnp.cjs --experimental-loader=file:///repo/.pnp.loader.mjs',
    }
  )
})

test('should resolve TypeScript loader through its package export', async () => {
  const typeScriptLoader = await resolveTypeScriptLoader()
  const typeScriptLoaderModule = await import(`${typeScriptLoader}?runtime-exec-argv`)

  assert.equal(
    typeScriptLoader,
    pathToFileURL(require.resolve('@atls/raijin/typescript-loader')).href
  )
  assert.equal(typeof typeScriptLoaderModule.load, 'function')
})

test('should resolve source-only TypeScript loader to its source URL', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'runtime-exec-argv-loader-'))
  const sourceDir = join(workspace, 'src', 'runtime')
  const packageJsonPath = join(workspace, 'package.json')
  const typeScriptLoaderPath = join(sourceDir, 'typescript-loader.ts')

  try {
    await mkdir(sourceDir, { recursive: true })
    await writeFile(packageJsonPath, JSON.stringify({ type: 'module' }), 'utf8')
    await writeFile(typeScriptLoaderPath, 'export const load = () => ({})\n')

    assert.equal(
      await resolveSourceTypeScriptLoader(packageJsonPath),
      pathToFileURL(typeScriptLoaderPath).href
    )
    assert.equal(
      await resolveTypeScriptLoader(packageJsonPath),
      pathToFileURL(typeScriptLoaderPath).href
    )
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test('should reject Raijin package without loadable TypeScript loader', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'runtime-exec-argv-loader-'))
  const packageJsonPath = join(workspace, 'package.json')

  try {
    await writeFile(packageJsonPath, JSON.stringify({ type: 'module' }), 'utf8')

    await assert.rejects(resolveTypeScriptLoader(packageJsonPath), (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal(error.constructor, Error)
      assert.equal(error.name, 'Error')
      assert.match(error.message, /Unable to resolve loadable TypeScript loader/)

      return true
    })
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test('should resolve PnP runtime from parent project root', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'runtime-exec-argv-'))
  const nestedWorkspace = join(workspace, 'backend', 'wallet', 'service')
  const pnpApiPath = join(workspace, '.pnp.cjs')
  const pnpEsmLoaderPath = join(workspace, '.pnp.loader.mjs')
  const typeScriptLoader = await resolveTypeScriptLoader()

  await mkdir(nestedWorkspace, { recursive: true })
  await writeFile(pnpApiPath, '')
  await writeFile(pnpEsmLoaderPath, '')

  try {
    assert.deepEqual(await createRuntimeExecArgv(nestedWorkspace), [
      '--require',
      pnpApiPath,
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
