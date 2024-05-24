/* eslint-disable no-shadow */

import * as loaderUtils                   from '@yarnpkg/pnp/lib/esm-loader/loaderUtils.js'

import * as tsLoaderUtils                 from './loader.utils.js'

import { fileURLToPath }                  from 'node:url'

import { getFormat as getFormatBaseHook } from '@yarnpkg/pnp/lib/esm-loader/hooks/getFormat.js'

export const getFormatHook = async (
  resolved: string,
  context: object,
  defaultGetFormat: typeof getFormatHook
): Promise<{ format: string }> =>
  getFormatBaseHook(resolved, context, async (resolved, context) => {
    const url = loaderUtils.tryParseURL(resolved)
    if (url?.protocol !== `file:`) return defaultGetFormat(resolved, context, defaultGetFormat)

    const filePath = fileURLToPath(url)

    const format = tsLoaderUtils.getFileFormat(filePath)
    if (format) {
      return {
        format,
      }
    }

    return defaultGetFormat(resolved, context, defaultGetFormat)
  })
