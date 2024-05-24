import { createRequire }     from 'node:module'

import webpack               from 'webpack'

import { StartServerPlugin } from '@atls/webpack-start-server-plugin'

const require = createRequire(import.meta.url)

const tsLoaderPath = require.resolve('ts-loader')
const webpackProtoImportsLoaderPath = require.resolve('@atls/webpack-proto-imports-loader')

export { webpack, StartServerPlugin, tsLoaderPath, webpackProtoImportsLoaderPath }
