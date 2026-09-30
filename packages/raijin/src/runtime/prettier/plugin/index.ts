import { createPlugin } from './create.js'

const plugin = await createPlugin()

export default plugin
export *      from './create.js'
export type * from './create.interfaces.js'
