import { resolve as resolveBaseHook } from '@yarnpkg/pnp/lib/esm-loader/hooks/resolve.js'

import { getTypeScriptSpecifiers }    from './resolve.utils.js'

// eslint-disable-next-line @typescript-eslint/naming-convention
export type resolveHookFn = (
  originalSpecifier: string,
  context: { conditions: Array<string>; parentURL: string | undefined },
  nextResolve: resolveHookFn
) => Promise<{ url: string; shortCircuit: boolean }>

const resolveSpecifiers = async (
  specifiers: Array<string>,
  context: { conditions: Array<string>; parentURL: string | undefined },
  nextResolve: resolveHookFn,
  index = 0
): Promise<{ url: string; shortCircuit: boolean }> => {
  try {
    return await resolveBaseHook(specifiers[index], context, nextResolve)
  } catch (err) {
    if (index === specifiers.length - 1) throw err

    return resolveSpecifiers(specifiers, context, nextResolve, index + 1)
  }
}

export const resolveHook: resolveHookFn = async (
  originalSpecifier: string,
  context: { conditions: Array<string>; parentURL: string | undefined },
  nextResolve: resolveHookFn
): Promise<{ url: string; shortCircuit: boolean }> =>
  resolveSpecifiers(getTypeScriptSpecifiers(originalSpecifier), context, nextResolve)
