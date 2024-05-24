import { resolve as resolveBaseHook } from '@yarnpkg/pnp/lib/esm-loader/hooks/resolve.js'

export const resolveHook = async (
  originalSpecifier: string,
  context: { conditions: Array<string>; parentURL: string | undefined },
  nextResolve: typeof resolveHook
): Promise<{ url: string; shortCircuit: boolean }> => {
  const tsSpecifier = originalSpecifier
    .replace(/\.(c|m)?js$/, `.$1ts`)
    .replace(/\.(c|m)?jsx$/, '.$1tsx')
  try {
    return resolveBaseHook(tsSpecifier, context, nextResolve)
  } catch (err) {
    if (tsSpecifier === originalSpecifier) throw err

    return resolveBaseHook(originalSpecifier, context, nextResolve)
  }
}
