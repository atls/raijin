import type { webpack } from '@atls/raijin/webpack'

import assert           from 'node:assert/strict'
import { test }         from 'node:test'

import { Compiler }     from '../compiler.js'

type WebpackOutput = {
  chunkFormat?: string
  library?: {
    type?: string
  }
  module?: boolean
}

const buildConfig = async (): Promise<webpack.Configuration> =>
  new Compiler({ tsLoader: 'ts-loader' }, '/workspace/icons', '/workspace/icons/dist').build()

test('should build icon compiler as ESM webpack output', async () => {
  const config = await buildConfig()
  const output = config.output as WebpackOutput

  assert.equal(output.library?.type, 'module')
  assert.equal(output.chunkFormat, 'module')
  assert.equal(output.module, true)
  assert.equal(config.externalsType, 'import')
  assert.deepEqual(config.experiments, { outputModule: true })
})

test('should not resolve CommonJS specifiers to CTS sources', async () => {
  const config = await buildConfig()
  const aliases = config.resolve?.extensionAlias as Record<string, Array<string>>

  assert.deepEqual(aliases['.js'], ['.js', '.ts'])
  assert.deepEqual(aliases['.mjs'], ['.mjs', '.mts'])
  assert.equal(aliases['.cjs'], undefined)
})

test('should compile bundled TypeScript as ESM', async () => {
  const config = await buildConfig()
  const [rule] = config.module?.rules as Array<webpack.RuleSetRule>
  const [use] = rule.use as Array<webpack.RuleSetUseItem>
  const { options } = use as { options: { compilerOptions: Record<string, string> } }

  assert.equal(options.compilerOptions.module, 'ESNext')
  assert.equal(options.compilerOptions.moduleResolution, 'Bundler')
})
