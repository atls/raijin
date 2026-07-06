import assert                              from 'node:assert/strict'
import { mkdir }                           from 'node:fs/promises'
import { mkdtemp }                         from 'node:fs/promises'
import { rm }                              from 'node:fs/promises'
import { symlink }                         from 'node:fs/promises'
import { writeFile }                       from 'node:fs/promises'
import { tmpdir }                          from 'node:os'
import { dirname }                         from 'node:path'
import { join }                            from 'node:path'
import { resolve }                         from 'node:path'
import test                                from 'node:test'
import { fileURLToPath }                   from 'node:url'
import { pathToFileURL }                   from 'node:url'

import { resolveTypeScriptLoader }         from '@atls/raijin/runtime-exec-argv'

import { createTestExecArgv }              from '../src/test-exec-argv.js'
import { createTestRuntimeExecArgv }       from '../src/test-exec-argv.js'
import { resolveRuntimeExecArgvModuleUrl } from '../src/test-exec-argv.js'

const currentDir = dirname(fileURLToPath(import.meta.url))
const raijinPackagePath = resolve(currentDir, '../../../yarn/raijin')

const linkRaijinRuntime = async (cwd: string): Promise<void> => {
  const scopePath = join(cwd, 'node_modules/@atls')

  await mkdir(scopePath, { recursive: true })
  await symlink(raijinPackagePath, join(scopePath, 'raijin'), 'dir')
}

test('should create TypeScript test exec argv without ts-node runtime', () => {
  assert.deepEqual(createTestExecArgv(), [
    '--loader',
    '@atls/raijin/typescript-loader',
    '--enable-source-maps',
  ])
})

test('should keep PnP loader before TypeScript test loader', () => {
  assert.deepEqual(createTestExecArgv('file:///repo/.pnp.loader.mjs'), [
    '--loader',
    'file:///repo/.pnp.loader.mjs',
    '--loader',
    '@atls/raijin/typescript-loader',
    '--enable-source-maps',
  ])
})

test('should create test runtime exec argv with loadable TypeScript loader', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'test-exec-argv-'))
  const nestedWorkspace = join(workspace, 'packages', 'service')
  const pnpEsmLoaderPath = join(workspace, '.pnp.loader.mjs')
  const typeScriptLoader = await resolveTypeScriptLoader()

  await mkdir(nestedWorkspace, { recursive: true })
  await writeFile(join(nestedWorkspace, 'package.json'), '{"type":"module"}\n')
  await linkRaijinRuntime(nestedWorkspace)
  await writeFile(pnpEsmLoaderPath, '')

  try {
    const execArgv = await createTestRuntimeExecArgv(nestedWorkspace)

    assert.deepEqual(execArgv, [
      '--loader',
      pathToFileURL(pnpEsmLoaderPath).href,
      '--loader',
      typeScriptLoader,
      '--enable-source-maps',
    ])
    assert.notEqual(fileURLToPath(typeScriptLoader).endsWith('.ts'), true)
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test('should resolve test runtime module through ancestor package boundary', async () => {
  const root = await mkdtemp(join(tmpdir(), 'test-exec-argv-workspace-'))
  const workspace = join(root, 'client', 'next-app')
  const runtime = join(root, 'node_modules/@atls/raijin')

  await mkdir(runtime, { recursive: true })
  await mkdir(workspace, { recursive: true })
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      type: 'module',
      devDependencies: {
        '@atls/raijin': 'workspace:*',
      },
    })
  )
  await writeFile(join(workspace, 'package.json'), '{"type":"module"}\n')
  await writeFile(
    join(runtime, 'package.json'),
    JSON.stringify({
      type: 'module',
      exports: {
        './runtime-exec-argv': './runtime-exec-argv.js',
      },
    })
  )
  await writeFile(
    join(runtime, 'runtime-exec-argv.js'),
    'export const createRuntimeExecArgv = (cwd) => ["workspace:" + cwd]\n'
  )

  try {
    assert.equal(
      resolveRuntimeExecArgvModuleUrl(workspace).endsWith(
        '/node_modules/@atls/raijin/runtime-exec-argv.js'
      ),
      true
    )
    assert.deepEqual(await createTestRuntimeExecArgv(workspace), [`workspace:${workspace}`])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
