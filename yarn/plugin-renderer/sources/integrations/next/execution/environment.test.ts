import type { PortablePath }              from '@yarnpkg/fslib'

import assert                             from 'node:assert/strict'
import test                               from 'node:test'
import { pathToFileURL }                  from 'node:url'

import { ppath }                          from '@yarnpkg/fslib'
import { xfs }                            from '@yarnpkg/fslib'

import { createNextExecutionEnvironment } from './environment.js'
import { extractPnpLoaderOption }         from './environment.js'
import { resolvePnpLoader }               from './environment.js'

test('should disable Next telemetry for renderer execution', () => {
  const env = createNextExecutionEnvironment(
    {
      NEXT_TELEMETRY_DISABLED: '0',
      NODE_ENV: 'production',
    },
    'file:///tmp/next-loader.mjs',
    '/repo/client' as PortablePath
  )

  assert.equal(env.NEXT_TELEMETRY_DISABLED, '1')
  assert.equal(env.NODE_ENV, 'production')
  assert.equal(env.RAIJIN_RENDERER_WORKSPACE_CWD, '/repo/client')
  assert.equal(env.RAIJIN_RENDERER_OUTPUT, undefined)
})

test('should pass renderer output when requested', () => {
  const env = createNextExecutionEnvironment(
    {},
    'file:///tmp/next-loader.mjs',
    '/repo/client' as PortablePath,
    {
      nextConfigAdapterPath: '/tmp/raijin-next-config-adapter.cjs' as PortablePath,
      output: 'standalone',
    }
  )

  assert.equal(env.NEXT_ADAPTER_PATH, '/tmp/raijin-next-config-adapter.cjs')
  assert.equal(env.RAIJIN_RENDERER_OUTPUT, 'standalone')
})

test('should pass the Next adapter without forcing renderer output', () => {
  const env = createNextExecutionEnvironment(
    {},
    'file:///tmp/next-loader.mjs',
    '/repo/client' as PortablePath,
    {
      nextConfigAdapterPath: '/tmp/raijin-next-config-adapter.cjs' as PortablePath,
    }
  )

  assert.equal(env.NEXT_ADAPTER_PATH, '/tmp/raijin-next-config-adapter.cjs')
  assert.equal(env.RAIJIN_RENDERER_OUTPUT, undefined)
})

test('should pass the Next loader through the managed environment', () => {
  const env = createNextExecutionEnvironment(
    {
      NODE_OPTIONS: '--require ./.pnp.cjs --experimental-loader file:///.pnp.loader.mjs',
    },
    'file:///tmp/next-loader.mjs',
    '/repo/client' as PortablePath
  )

  assert.equal(
    env.NODE_OPTIONS,
    '--require ./.pnp.cjs --experimental-loader file:///.pnp.loader.mjs'
  )
  assert.equal(env.RAIJIN_NODE_LOADER, 'file:///tmp/next-loader.mjs')
})

test('should extract an existing PnP loader option', () => {
  assert.deepEqual(
    extractPnpLoaderOption(
      '--require ./.pnp.cjs --experimental-loader file:///.pnp.loader.mjs --enable-source-maps'
    ),
    {
      nodeOptions: '--require ./.pnp.cjs --enable-source-maps',
      loader: 'file:///.pnp.loader.mjs',
    }
  )
})

test('should preserve unrelated loaders while extracting the PnP loader', () => {
  assert.deepEqual(
    extractPnpLoaderOption(
      '--loader file:///tmp/custom-loader.mjs --experimental-loader file:///.pnp.loader.mjs'
    ),
    {
      nodeOptions: '--loader file:///tmp/custom-loader.mjs',
      loader: 'file:///.pnp.loader.mjs',
    }
  )
})

test('should resolve the project PnP loader after managed environment cleanup', async () => {
  const cwd = await xfs.mktempPromise()
  const pnpLoader = ppath.join(cwd, '.pnp.loader.mjs')

  await xfs.writeFilePromise(pnpLoader, '')

  assert.equal(
    await resolvePnpLoader(
      cwd,
      '--require ./.pnp.cjs --import data:text/javascript,managed-loader'
    ),
    pathToFileURL(pnpLoader).href
  )
})
