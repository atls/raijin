import type { PortablePath } from '@yarnpkg/fslib'

import { pathToFileURL }     from 'node:url'

import { npath }             from '@yarnpkg/fslib'
import { ppath }             from '@yarnpkg/fslib'
import { xfs }               from '@yarnpkg/fslib'

const NEXT_COMPILED_CONF_LOADER_FILENAME = 'next-compiled-conf-require-cache-loader.mjs'
const NEXT_COMPILED_CONF_LOADER_OPTION = '--experimental-loader'

export const NEXT_COMPILED_CONF_REQUIRE_CACHE_LOADER_SOURCE = `
const REQUIRE_CACHE_NEEDLE = 'delete require.cache[__filename]'
const REQUIRE_CACHE_REPLACEMENT = 'if (require.cache) delete require.cache[__filename]'

const isNextCompiledConf = (url) =>
  url.includes('/node_modules/next/') && url.includes('/dist/compiled/conf/index.js')

const patchSource = (source) =>
  source.split(REQUIRE_CACHE_NEEDLE).join(REQUIRE_CACHE_REPLACEMENT)

export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context)

  if (!isNextCompiledConf(url)) {
    return result
  }

  if (typeof result.source === 'string') {
    return {
      ...result,
      source: patchSource(result.source),
    }
  }

  if (result.source instanceof Uint8Array) {
    return {
      ...result,
      source: patchSource(Buffer.from(result.source).toString('utf8')),
    }
  }

  return result
}
`.trimStart()

const appendNodeOption = (nodeOptions: string | undefined, option: string, value: string): string =>
  [nodeOptions, option, value].filter(Boolean).join(' ')

export const createRendererBuildEnv = (
  env: NodeJS.ProcessEnv,
  nextCompiledConfRequireCacheLoader: string
): NodeJS.ProcessEnv => ({
  ...env,
  NEXT_TELEMETRY_DISABLED: '1',
  NODE_OPTIONS: appendNodeOption(
    env.NODE_OPTIONS,
    NEXT_COMPILED_CONF_LOADER_OPTION,
    nextCompiledConfRequireCacheLoader
  ),
})

export const assertRendererBuildExitCode = (code: number): void => {
  if (code !== 0) {
    throw new Error(`Renderer build failed with exit code ${code}`)
  }
}

export const materializeNextCompiledConfRequireCacheLoader = async (
  binFolder: PortablePath
): Promise<string> => {
  const loaderPath = ppath.join(binFolder, NEXT_COMPILED_CONF_LOADER_FILENAME)

  await xfs.writeFilePromise(loaderPath, NEXT_COMPILED_CONF_REQUIRE_CACHE_LOADER_SOURCE)

  return pathToFileURL(npath.fromPortablePath(loaderPath)).href
}
