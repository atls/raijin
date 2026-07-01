import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import webpack           from 'webpack'

const require = createRequire(import.meta.url)

const tsLoaderPath = require.resolve('ts-loader')
const nodeLoaderPath = require.resolve('node-loader')
const protoLoaderPath = fileURLToPath(new URL('./webpack/proto-imports.loader.js', import.meta.url))

export { webpack, tsLoaderPath, nodeLoaderPath, protoLoaderPath }
