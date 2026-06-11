import assert                           from 'node:assert/strict'
import { mkdir }                        from 'node:fs/promises'
import { mkdtemp }                      from 'node:fs/promises'
import { rm }                           from 'node:fs/promises'
import { writeFile }                    from 'node:fs/promises'
import { tmpdir }                       from 'node:os'
import { join }                         from 'node:path'
import test                             from 'node:test'
import { fileURLToPath }                from 'node:url'
import { pathToFileURL }                from 'node:url'

import { createServiceExecArgv }        from '../src/service-exec-argv.js'
import { createServiceRuntimeExecArgv } from '../src/service-exec-argv.js'
import { resolveTypeScriptLoader }      from '../src/service-exec-argv.js'

test('should create service exec argv without PnP loader', () => {
  assert.deepEqual(createServiceExecArgv(undefined, 'file:///runtime/typescript-loader.js'), [
    '--loader',
    'file:///runtime/typescript-loader.js',
    '--enable-source-maps',
  ])
})

test('should keep PnP loader before TypeScript service loader', () => {
  assert.deepEqual(
    createServiceExecArgv('file:///repo/.pnp.loader.mjs', 'file:///runtime/typescript-loader.js'),
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
  assert.ok(
    fileURLToPath(await resolveTypeScriptLoader()).endsWith(
      join('runtime', 'code-runtime', 'dist', 'typescript-loader.js')
    )
  )
})

test('should resolve PnP loader from parent project root', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'service-exec-argv-'))
  const nestedWorkspace = join(workspace, 'backend', 'wallet', 'service')
  const pnpEsmLoaderPath = join(workspace, '.pnp.loader.mjs')
  const typeScriptLoader = await resolveTypeScriptLoader()

  await mkdir(nestedWorkspace, { recursive: true })
  await writeFile(pnpEsmLoaderPath, '')

  try {
    assert.deepEqual(await createServiceRuntimeExecArgv(nestedWorkspace), [
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
