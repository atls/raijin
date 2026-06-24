import type { Config }       from 'prettier'

import assert                from 'node:assert/strict'
import { test }              from 'node:test'

import * as babel            from 'prettier/plugins/babel'
import * as estree           from 'prettier/plugins/estree'
import * as typescript       from 'prettier/plugins/typescript'
import { format }            from 'prettier/standalone'

import { getPrettierPlugin } from '../index.js'

const formatTypeScript = async (source: string): Promise<string> => {
  const plugin = await getPrettierPlugin()

  return format(source, {
    parser: 'typescript',
    semi: false,
    singleQuote: true,
    plugins: [estree, babel, typescript, plugin] as Config['plugins'],
  })
}

const assertFormatted = async (source: string, expected: string): Promise<void> => {
  const formatted = await formatTypeScript(source)

  assert.equal(formatted, expected)
  assert.equal(await formatTypeScript(formatted), expected)
}

test('should align source clauses in export barrel declarations', async () => {
  const source = [
    "export * from './constants.js'",
    "export type * from './interfaces.js'",
    "export { Foo } from './foo.js'",
    "export type { Foo } from './foo.interfaces.js'",
    'export const value = 1',
  ].join('\n')

  await assertFormatted(
    source,
    [
      "export *            from './constants.js'",
      "export type *       from './interfaces.js'",
      "export { Foo }      from './foo.js'",
      "export type { Foo } from './foo.interfaces.js'",
      'export const value = 1',
      '',
    ].join('\n')
  )
})

test('should align namespace export all declarations by their exported binding', async () => {
  const source = [
    "export * from './short.js'",
    "export * as ns from './namespace.js'",
    "export type * as Types from './types.js'",
    "export type { Value } from './value.js'",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "export *               from './short.js'",
      "export * as ns         from './namespace.js'",
      "export type * as Types from './types.js'",
      "export type { Value }  from './value.js'",
      '',
    ].join('\n')
  )
})

test('should keep import and export source alignment independent', async () => {
  const source = [
    "import { Foo } from './foo.js'",
    "import type { LongNamedType } from './interfaces.js'",
    "export * from './constants.js'",
    "export type { Foo } from './foo.interfaces.js'",
  ].join('\n')

  assert.equal(
    await formatTypeScript(source),
    [
      "import type { LongNamedType } from './interfaces.js'",
      '',
      "import { Foo }                from './foo.js'",
      "export *            from './constants.js'",
      "export type { Foo } from './foo.interfaces.js'",
      '',
    ].join('\n')
  )
})

test('should keep source exports outside wrapped named exports idempotent', async () => {
  const source = [
    "export { AlphaAlphaAlpha, BetaBetaBeta, GammaGammaGamma, DeltaDeltaDelta } from './very-long-source-module-name.js'",
    "export * from './short.js'",
  ].join('\n')

  await assertFormatted(
    source,
    [
      'export {',
      '  AlphaAlphaAlpha,',
      '  BetaBetaBeta,',
      '  GammaGammaGamma,',
      '  DeltaDeltaDelta,',
      "} from './very-long-source-module-name.js'",
      "export * from './short.js'",
      '',
    ].join('\n')
  )
})

test('should align named exports that become single line after formatting', async () => {
  const source = [
    'export {',
    '  Foo,',
    "} from './foo.js'",
    "export type { LongerNamedType } from './types.js'",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "export { Foo }                  from './foo.js'",
      "export type { LongerNamedType } from './types.js'",
      '',
    ].join('\n')
  )
})

test('should not align source exports across local export declarations', async () => {
  const source = [
    "export * from './a.js'",
    'export const value = 1',
    "export type { VeryLongNamedType } from './types.js'",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "export * from './a.js'",
      'export const value = 1',
      "export type { VeryLongNamedType } from './types.js'",
      '',
    ].join('\n')
  )
})

test('should keep module source alignment idempotent', async () => {
  const source = [
    "import type { LongNamedType } from './interfaces.js'",
    '',
    "import { Foo }                from './foo.js'",
    '',
    "export *            from './constants.js'",
    "export type { Foo } from './foo.interfaces.js'",
    '',
  ].join('\n')

  await assertFormatted(source, source)
})
