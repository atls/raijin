import type { IconTransformer }                from '../../../application/generation/icons/index.js'

import { create as createSvgrIconTransformer } from '../../adapters/svgr/icons/transform.js'

export { create as createIconOutputReplacer } from '../../adapters/node/icons/output.js'
export { create as createIconSourceReader }   from '../../adapters/node/icons/source.js'

export const createIconTransformer = (cwd: string): IconTransformer =>
  createSvgrIconTransformer(cwd)
