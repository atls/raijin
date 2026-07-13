import { getPrettierPlugin } from './getters/index.js'

const plugin = await getPrettierPlugin()

export default plugin
export * from './getters/index.js'
