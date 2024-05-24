import { createRequire } from 'node:module'

import webpack           from 'webpack'

const require = createRequire(import.meta.url)

const tsLoaderPath = require.resolve('ts-loader')
const nodeLoaderPath = require.resolve('node-loader')

export { webpack, tsLoaderPath, nodeLoaderPath }
