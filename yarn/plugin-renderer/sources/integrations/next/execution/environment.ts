import type { Filename }                        from '@yarnpkg/fslib'
import type { PortablePath }                    from '@yarnpkg/fslib'

import type { ExtractedNodeLoader }             from './environment.interfaces.js'
import type { NextExecutionEnvironmentOptions } from './environment.interfaces.js'

import { pathToFileURL }                        from 'node:url'

import { npath }                                from '@yarnpkg/fslib'
import { ppath }                                from '@yarnpkg/fslib'
import { xfs }                                  from '@yarnpkg/fslib'

import { NEXT_CONFIG_ADAPTER_PATH_ENV }         from '@atls/raijin/config/next'
import { RAIJIN_RENDERER_OUTPUT_ENV }           from '@atls/raijin/config/next'
import { RAIJIN_RENDERER_WORKSPACE_CWD_ENV }    from '@atls/raijin/config/next'

const NODE_LOADER_OPTIONS = new Set(['--experimental-loader', '--loader'])
const PNP_ESM_LOADER = '.pnp.loader.mjs' as Filename
const RAIJIN_NODE_LOADER = 'RAIJIN_NODE_LOADER'

const isPnpNodeLoader = (value: string | undefined): boolean =>
  value?.includes(PNP_ESM_LOADER) ?? false

export const createNextExecutionEnvironment = (
  env: NodeJS.ProcessEnv,
  loader: string,
  rendererCwd: PortablePath,
  options: NextExecutionEnvironmentOptions = {}
): NodeJS.ProcessEnv => ({
  ...env,
  NEXT_TELEMETRY_DISABLED: '1',
  [RAIJIN_RENDERER_WORKSPACE_CWD_ENV]: npath.fromPortablePath(rendererCwd),
  [RAIJIN_NODE_LOADER]: loader,
  ...(options.nextConfigAdapterPath
    ? {
        [NEXT_CONFIG_ADAPTER_PATH_ENV]: npath.fromPortablePath(options.nextConfigAdapterPath),
      }
    : {}),
  ...(options.output ? { [RAIJIN_RENDERER_OUTPUT_ENV]: options.output } : {}),
})

export const extractPnpLoaderOption = (nodeOptions: string | undefined): ExtractedNodeLoader => {
  if (!nodeOptions) {
    return {
      nodeOptions,
      loader: undefined,
    }
  }

  const tokens = nodeOptions.split(/\s+/).filter(Boolean)

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const separatorIndex = token.indexOf('=')
    const hasInlineValue = separatorIndex !== -1
    const option = hasInlineValue ? token.slice(0, separatorIndex) : token

    if (!NODE_LOADER_OPTIONS.has(option)) {
      continue
    }

    const loader = hasInlineValue ? token.slice(separatorIndex + 1) : tokens[index + 1]

    if (!isPnpNodeLoader(loader)) {
      continue
    }

    const tokenCount = hasInlineValue ? 1 : 2
    const nextTokens = [...tokens.slice(0, index), ...tokens.slice(index + tokenCount)]

    return {
      nodeOptions: nextTokens.length > 0 ? nextTokens.join(' ') : undefined,
      loader,
    }
  }

  return {
    nodeOptions,
    loader: undefined,
  }
}

export const resolvePnpLoader = async (
  projectCwd: PortablePath,
  nodeOptions: string | undefined
): Promise<string | undefined> => {
  const pnpLoaderPath = ppath.join(projectCwd, PNP_ESM_LOADER)

  if (await xfs.existsPromise(pnpLoaderPath)) {
    return pathToFileURL(npath.fromPortablePath(pnpLoaderPath)).href
  }

  return extractPnpLoaderOption(nodeOptions).loader
}
