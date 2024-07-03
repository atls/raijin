/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-shadow */

import fs                                 from 'node:fs'
import { fileURLToPath }                  from 'node:url'
import { pathToFileURL }                  from 'node:url'

import * as loaderUtils                   from '@yarnpkg/pnp/lib/esm-loader/loaderUtils.js'
import { VirtualFS }                      from '@yarnpkg/fslib'
import { WATCH_MODE_MESSAGE_USES_ARRAYS } from '@yarnpkg/pnp/lib/esm-loader/loaderFlags.js'
import { npath }                          from '@yarnpkg/fslib'
import { load as loadBaseHook }           from '@yarnpkg/pnp/lib/esm-loader/hooks/load.js'

import * as tsLoaderUtils                 from './loader.utils.js'

export type loadHookFn = (
  urlString: string,
  context: { format: string | null | undefined },
  nextLoad: loadHookFn
) => Promise<{ format: string; source: string; shortCircuit: boolean }>

export const loadHook: loadHookFn = async (
  urlString: string,
  context: { format: string | null | undefined },
  nextLoad: loadHookFn
): Promise<{ format: string; source: string; shortCircuit: boolean }> =>
  // @ts-expect-error any
  loadBaseHook(urlString, context, async (urlString, context) => {
    const url = loaderUtils.tryParseURL(urlString)
    if (url?.protocol !== `file:`) return nextLoad(urlString, context, nextLoad)

    const filePath = fileURLToPath(url)

    const format = tsLoaderUtils.getFileFormat(filePath)
    if (!format) return nextLoad(urlString, context, nextLoad)

    // https://github.com/nodejs/node/pull/44366/files#diff-f6796082f599554ec3a29c47cf026cb24fc5104884f2632e472c05fe622d778bR477-R479
    if (process.env.WATCH_REPORT_DEPENDENCIES && process.send) {
      // At the time of writing Node.js reports all loaded URLs itself so
      // we technically only need to do this for virtual files but in the
      // event that ever changes we report everything.
      const pathToSend = pathToFileURL(
        npath.fromPortablePath(VirtualFS.resolveVirtual(npath.toPortablePath(filePath)))
      ).href
      process.send({
        'watch:import': WATCH_MODE_MESSAGE_USES_ARRAYS ? [pathToSend] : pathToSend,
      })
    }

    const source = await fs.promises.readFile(filePath, `utf8`)

    return {
      format,
      source: tsLoaderUtils.transformSource(
        source,
        format,
        filePath.includes('.tsx') ? 'tsx' : 'ts'
      ),
      shortCircuit: true,
    }
  })
