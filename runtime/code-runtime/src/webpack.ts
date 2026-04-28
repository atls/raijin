import { createRequire } from 'node:module'

import webpack           from 'webpack'

const require = createRequire(import.meta.url)

const tsLoaderPath = require.resolve('ts-loader')
const nodeLoaderPath = require.resolve('node-loader')
const protoLoaderPath = require.resolve('@atls/webpack-proto-imports-loader')

export { webpack, tsLoaderPath, nodeLoaderPath, protoLoaderPath }
