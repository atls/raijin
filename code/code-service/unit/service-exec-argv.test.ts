import assert                           from 'node:assert/strict'
import { mkdir }                        from 'node:fs/promises'
import { mkdtemp }                      from 'node:fs/promises'
import { rm }                           from 'node:fs/promises'
import { writeFile }                    from 'node:fs/promises'
import { tmpdir }                       from 'node:os'
import { join }                         from 'node:path'
import test                             from 'node:test'
import { pathToFileURL }                from 'node:url'

import { createServiceExecArgv }        from '../src/service-exec-argv.js'
import { createServiceRuntimeExecArgv } from '../src/service-exec-argv.js'

test('should create service exec argv without PnP loader', () => {
  assert.deepEqual(createServiceExecArgv(), [
    '--loader',
    '@atls/code-runtime/typescript-loader',
    '--enable-source-maps',
  ])
})

test('should keep PnP loader before TypeScript service loader', () => {
  assert.deepEqual(createServiceExecArgv('file:///repo/.pnp.loader.mjs'), [
    '--loader',
    'file:///repo/.pnp.loader.mjs',
    '--loader',
    '@atls/code-runtime/typescript-loader',
    '--enable-source-maps',
  ])
})

test('should resolve PnP loader from parent project root', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'service-exec-argv-'))
  const nestedWorkspace = join(workspace, 'backend', 'wallet', 'service')
  const pnpEsmLoaderPath = join(workspace, '.pnp.loader.mjs')

  await mkdir(nestedWorkspace, { recursive: true })
  await writeFile(pnpEsmLoaderPath, '')

  try {
    assert.deepEqual(await createServiceRuntimeExecArgv(nestedWorkspace), [
      '--loader',
      pathToFileURL(pnpEsmLoaderPath).href,
      '--loader',
      '@atls/code-runtime/typescript-loader',
      '--enable-source-maps',
    ])
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})
