import { HAS_CONSOLIDATED_HOOKS } from '@yarnpkg/pnp/lib/esm-loader/loaderFlags.js'

import { getFormatHook }          from './hooks/index.js'
import { getSourceHook }          from './hooks/index.js'
import { loadHook }               from './hooks/index.js'
import { resolveHook }            from './hooks/index.js'
// eslint-disable-next-line
import { tfspatch }               from './tfspatch.js'

export const resolve = resolveHook
export const getFormat = HAS_CONSOLIDATED_HOOKS ? undefined : getFormatHook
export const getSource = HAS_CONSOLIDATED_HOOKS ? undefined : getSourceHook
export const load = HAS_CONSOLIDATED_HOOKS ? loadHook : undefined
