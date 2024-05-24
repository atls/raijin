import { loadHook }    from './hooks/index.js'
import { resolveHook } from './hooks/index.js'
// eslint-disable-next-line
import { tfspatch }    from './tfspatch.js'

export const resolve = resolveHook
export const load = loadHook
