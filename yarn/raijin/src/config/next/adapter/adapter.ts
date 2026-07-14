import type { Filename }                            from '@yarnpkg/fslib'
import type { PortablePath }                        from '@yarnpkg/fslib'

import type { MaterializeNextConfigAdapterOptions } from './adapter.interfaces.js'
import type { NextConfigShape }                     from './adapter.interfaces.js'

import { ppath }                                    from '@yarnpkg/fslib'
import { xfs }                                      from '@yarnpkg/fslib'

export const NEXT_CONFIG_ADAPTER_PATH_ENV = 'NEXT_ADAPTER_PATH'
export const RAIJIN_RENDERER_OUTPUT_ENV = 'RAIJIN_RENDERER_OUTPUT'
export const RAIJIN_RENDERER_WORKSPACE_CWD_ENV = 'RAIJIN_RENDERER_WORKSPACE_CWD'

const ADAPTER_FILENAME = 'raijin-next-config-adapter.cjs' as Filename

export const applyNextConfig = (
  config: NextConfigShape,
  env: NodeJS.ProcessEnv
): NextConfigShape => {
  const extensionAlias = config.experimental?.extensionAlias ?? {
    '.js': ['.js', '.tsx', '.ts'],
    '.jsx': ['.jsx', '.tsx', '.ts'],
    '.mjs': ['.mjs', '.mts'],
  }
  const configuredWebpack = config.webpack

  return {
    ...config,
    experimental: {
      ...config.experimental,
      extensionAlias,
    },
    ...(config.output === undefined && env.RAIJIN_RENDERER_OUTPUT
      ? { output: env.RAIJIN_RENDERER_OUTPUT }
      : {}),
    turbopack: {
      ...config.turbopack,
      ...(config.turbopack?.root === undefined && env.RAIJIN_RENDERER_WORKSPACE_CWD
        ? { root: env.RAIJIN_RENDERER_WORKSPACE_CWD }
        : {}),
    },
    webpack(webpackConfig, context) {
      const resolve =
        webpackConfig.resolve && typeof webpackConfig.resolve === 'object'
          ? (webpackConfig.resolve as Record<string, unknown>)
          : {}

      resolve.extensionAlias ??= extensionAlias
      webpackConfig.resolve = resolve

      return configuredWebpack ? configuredWebpack(webpackConfig, context) : webpackConfig
    },
  }
}

export const createNextConfigAdapterSource = (): string =>
  `
const applyNextConfig = ${applyNextConfig.toString()}

module.exports = {
  name: 'raijin-renderer',
  modifyConfig(config) {
    return applyNextConfig(config, process.env)
  },
}
`.trimStart()

export const materializeNextConfigAdapter = async ({
  cwd,
}: MaterializeNextConfigAdapterOptions): Promise<PortablePath> => {
  const path = ppath.join(cwd, ADAPTER_FILENAME)

  await xfs.writeFilePromise(path, createNextConfigAdapterSource())

  return path
}
