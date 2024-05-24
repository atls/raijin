import * as loaderUtils                   from '@yarnpkg/pnp/lib/esm-loader/loaderUtils.js'

import * as tsLoaderUtils                 from './loader.utils.js'

import { getSource as getSourceBaseHook } from '@yarnpkg/pnp/lib/esm-loader/hooks/getSource.js'

export const getSourceHook = async (
  urlString: string,
  context: { format: string },
  defaultGetSource: typeof getSourceBaseHook
): Promise<{ source: string }> => {
  const result = await getSourceHook(urlString, context, defaultGetSource)

  const url = loaderUtils.tryParseURL(urlString)
  if (url?.protocol !== `file:`) return defaultGetSource(urlString, context, defaultGetSource)

  return {
    source: tsLoaderUtils.transformSource(
      result.source,
      context.format,
      urlString.includes('.tsx') ? 'tsx' : 'ts'
    ),
  }
}
