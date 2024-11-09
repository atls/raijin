import { loadHook }    from './hooks/index.js'
import { resolveHook } from './hooks/index.js'
// @ts-expect-error: Require order
import { tfspatch }    from './tfspatch.js' // eslint-disable-line

export const resolve = resolveHook
export const load = loadHook
