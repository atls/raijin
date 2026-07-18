import type { webpack } from '@atls/raijin/webpack'
import type tsLoader    from 'ts-loader'

import assert           from 'node:assert/strict'
import { test }         from 'node:test'

import { Compiler }     from '../compiler.js'

const buildConfig = async (): Promise<webpack.Configuration> =>
  new Compiler({ tsLoader: 'ts-loader' }, '/workspace/icons', '/workspace/icons/dist').build()

test('should build icon compiler as ESM webpack output', async () => {
  const config = await buildConfig()
  const { output } = config

  assert.ok(output)
  assert.ok(
    typeof output.library === 'object' && !Array.isArray(output.library) && 'type' in output.library
  )

  assert.equal(output.library.type, 'module')
  assert.equal(output.chunkFormat, 'module')
  assert.equal(output.module, true)
  assert.equal(config.externalsType, 'import')
  assert.deepEqual(config.experiments, { outputModule: true })
})

test('should not resolve CommonJS specifiers to CTS sources', async () => {
  const config = await buildConfig()
  const aliases = config.resolve?.extensionAlias

  assert.ok(aliases)

  assert.deepEqual(aliases['.js'], ['.js', '.ts'])
  assert.deepEqual(aliases['.mjs'], ['.mjs', '.mts'])
  assert.equal(aliases['.cjs'], undefined)
})

test('should compile bundled TypeScript as ESM', async () => {
  const config = await buildConfig()
  const [rule] = config.module?.rules as Array<webpack.RuleSetRule>
  const [use] = rule.use as Array<webpack.RuleSetUseItem>

  assert.ok(typeof use === 'object')
  const options = use.options as Partial<tsLoader.Options>
  const { compilerOptions } = options

  assert.ok(compilerOptions)
  assert.equal(compilerOptions.module, 'ESNext')
  assert.equal(compilerOptions.moduleResolution, 'Bundler')
})
