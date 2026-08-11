import type { IconTransformer } from '../../../application/icons/generation/index.js'

import { create as createNodeIconOutputReplacer } from '../../adapters/node/icons/output.js'
import { create as createSvgrIconTransformer }    from '../../adapters/svgr/icons/transform.js'

export { create as createIconSourceReader } from '../../adapters/node/icons/source.js'

export const createIconOutputReplacer = () => createNodeIconOutputReplacer()

export const createIconTransformer = (cwd: string): IconTransformer =>
  createSvgrIconTransformer(cwd)
