import assert                        from 'node:assert/strict'
import { mkdir }                     from 'node:fs/promises'
import { mkdtemp }                   from 'node:fs/promises'
import { rm }                        from 'node:fs/promises'
import { writeFile }                 from 'node:fs/promises'
import { tmpdir }                    from 'node:os'
import { join }                      from 'node:path'
import test                          from 'node:test'
import { fileURLToPath }             from 'node:url'
import { pathToFileURL }             from 'node:url'

import { resolveTypeScriptLoader }   from '@atls/raijin/runtime-exec-argv'

import { createTestExecArgv }        from '../src/test-exec-argv.js'
import { createTestRuntimeExecArgv } from '../src/test-exec-argv.js'

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
