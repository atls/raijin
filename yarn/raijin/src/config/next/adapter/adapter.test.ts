import assert                           from 'node:assert/strict'
import { createRequire }                from 'node:module'
import test                             from 'node:test'

import { npath }                        from '@yarnpkg/fslib'
import { xfs }                          from '@yarnpkg/fslib'

import { materializeNextConfigAdapter } from './adapter.js'
import { withRaijinRendererConfig }     from './adapter.js'

const require = createRequire(import.meta.url)

test('should apply renderer defaults without replacing project config', () => {
  const webpack = (config: Record<string, unknown>): Record<string, unknown> => ({
    ...config,
    project: true,
  })
  const config = withRaijinRendererConfig(
    {
      experimental: {
        extensionAlias: { '.js': ['.js'] },
      },
      output: 'export',
      turbopack: { root: '/project' },
      webpack,
    },
    {
      RAIJIN_RENDERER_OUTPUT: 'standalone',
      RAIJIN_RENDERER_WORKSPACE_CWD: '/workspace',
    }
  )
  const webpackConfig = config.webpack?.({}, {}) as Record<string, unknown>

  assert.equal(config.output, 'export')
  assert.equal(config.turbopack?.root, '/project')
  assert.deepEqual(config.experimental?.extensionAlias, { '.js': ['.js'] })
  assert.equal(webpackConfig.project, true)
})

test('should apply renderer config through the adapter boundary', () => {
  const config = withRaijinRendererConfig(
    {},
    {
      RAIJIN_RENDERER_OUTPUT: 'standalone',
      RAIJIN_RENDERER_WORKSPACE_CWD: '/workspace',
    }
  )

  assert.equal(config.output, 'standalone')
  assert.equal(config.turbopack?.root, '/workspace')
  assert.deepEqual(config.experimental?.extensionAlias?.['.mjs'], ['.mjs', '.mts'])
})

test('should preserve project adapters during explicit config composition', () => {
  const config = withRaijinRendererConfig(
    {
      adapterPath: '/project/stable-adapter.js',
      experimental: {
        adapterPath: '/project/experimental-adapter.js',
      },
    },
    {
      RAIJIN_RENDERER_WORKSPACE_CWD: '/workspace',
    }
  )

  assert.equal(config.adapterPath, '/project/stable-adapter.js')
  assert.equal(config.experimental?.adapterPath, '/project/experimental-adapter.js')
  assert.equal(config.turbopack?.root, '/workspace')
})

test('should materialize a loadable Next adapter module', async () => {
  const cwd = await xfs.mktempPromise()
  const path = await materializeNextConfigAdapter({ cwd })
  // eslint-disable-next-line security/detect-non-literal-require
  const adapter = require(npath.fromPortablePath(path)) as {
    name: string
    modifyConfig: (config: Record<string, unknown>) => Record<string, unknown>
  }

  assert.equal(adapter.name, 'raijin-renderer')
  assert.equal(adapter.modifyConfig({}).turbopack instanceof Object, true)
})
