import { resolve as resolveBaseHook } from '@yarnpkg/pnp/lib/esm-loader/hooks/resolve.js'

// eslint-disable-next-line @typescript-eslint/naming-convention
export type resolveHookFn = (
  originalSpecifier: string,
  context: { conditions: Array<string>; parentURL: string | undefined },
  nextResolve: resolveHookFn
) => Promise<{ url: string; shortCircuit: boolean }>

export const resolveHook: resolveHookFn = async (
  originalSpecifier: string,
  context: { conditions: Array<string>; parentURL: string | undefined },
  nextResolve: resolveHookFn
): Promise<{ url: string; shortCircuit: boolean }> => {
  const tsSpecifier = originalSpecifier
    .replace(/\.(c|m)?js$/, `.$1ts`)
    .replace(/\.(c|m)?jsx$/, '.$1tsx')
  try {
    return await resolveBaseHook(tsSpecifier, context, nextResolve)
  } catch (err) {
    if (tsSpecifier === originalSpecifier) throw err

    return resolveBaseHook(originalSpecifier, context, nextResolve)
  }
}
