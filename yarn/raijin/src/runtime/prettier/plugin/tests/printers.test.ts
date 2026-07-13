import type { Config }       from 'prettier'

import assert                from 'node:assert/strict'
import { test }              from 'node:test'

import * as babel            from 'prettier/plugins/babel'
import * as estree           from 'prettier/plugins/estree'
import * as typescript       from 'prettier/plugins/typescript'
import { format }            from 'prettier/standalone'

import { getPrettierPlugin } from '../index.js'
import defaultPlugin         from '../index.js'

const formatTypeScript = async (source: string, options: Partial<Config> = {}): Promise<string> => {
  const plugin = await getPrettierPlugin({ workspacePackageNames: [] })

  return format(source, {
    parser: 'typescript',
    semi: false,
    singleQuote: true,
    plugins: [estree, babel, typescript, plugin] as Config['plugins'],
    ...options,
  })
}

const assertFormatted = async (
  source: string,
  expected: string,
  options: Partial<Config> = {}
): Promise<void> => {
  const formatted = await formatTypeScript(source, options)

  assert.equal(formatted, expected)
  assert.equal(await formatTypeScript(formatted, options), expected)
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

test('should separate Yarn project packages from external modules', async () => {
  const plugin = await getPrettierPlugin({ workspacePackageNames: ['@atls/code-format'] })
  const source = [
    "import { Formatter } from '@atls/code-format'",
    "import { Project } from '@yarnpkg/core'",
  ].join('\n')

  const formatted = await format(source, {
    parser: 'typescript',
    semi: false,
    singleQuote: true,
    plugins: [estree, babel, typescript, plugin] as Config['plugins'],
  })

  assert.equal(
    formatted,
    [
      "import { Project }   from '@yarnpkg/core'",
      '',
      "import { Formatter } from '@atls/code-format'",
      '',
    ].join('\n')
  )
})

test('should preserve Yarn workspace classification for plugin defaults', async () => {
  const source = [
    "import { Formatter } from '@atls/code-format'",
    "import { Project } from '@yarnpkg/core'",
  ].join('\n')
  const expected = [
    "import { Project }   from '@yarnpkg/core'",
    '',
    "import { Formatter } from '@atls/code-format'",
    '',
  ].join('\n')

  const plugins = [defaultPlugin, await getPrettierPlugin()]
  const results = await Promise.all(
    plugins.map(async (plugin) =>
      format(source, {
        parser: 'typescript',
        semi: false,
        singleQuote: true,
        plugins: [estree, babel, typescript, plugin] as Config['plugins'],
      }))
  )

  assert.deepEqual(results, [expected, expected])
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

test('should align namespace exports that become single line after formatting', async () => {
  const source = [
    'export * as',
    "  ns from './namespace.js'",
    "export { VeryLongName } from './x.js'",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "export * as ns          from './namespace.js'",
      "export { VeryLongName } from './x.js'",
      '',
    ].join('\n')
  )
})

test('should align string literal export names by their printed quotes', async () => {
  const source = [
    "export { 'foo-bar' as fooBar } from './foo.js'",
    "export { Value } from './value.js'",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "export { 'foo-bar' as fooBar } from './foo.js'",
      "export { Value }               from './value.js'",
      '',
    ].join('\n')
  )
})

test('should prefer the least-escaped configured quote for string literal export names', async () => {
  const source = [
    "export { \"can't\" as can } from './foo.js'",
    "export { Value } from './value.js'",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "export { \"can't\" as can } from './foo.js'",
      "export { Value }          from './value.js'",
      '',
    ].join('\n')
  )
})

test('should escape string literal export names before measuring source columns', async () => {
  const source = [
    "export { 'a\\nb' as ab } from './foo.js'",
    "export { Value } from './value.js'",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "export { 'a\\nb' as ab } from './foo.js'",
      "export { Value }        from './value.js'",
      '',
    ].join('\n')
  )
})

test('should leave commented export declarations outside source alignment', async () => {
  const source = [
    "export { Foo /* this comment makes the declaration unsafe to project */ } from './foo.js'",
    "export * from './short.js'",
  ].join('\n')

  await assertFormatted(
    source,
    [
      'export {',
      '  Foo /* this comment makes the declaration unsafe to project */,',
      "} from './foo.js'",
      "export * from './short.js'",
      '',
    ].join('\n')
  )
})

test('should leave line-commented export declarations outside source alignment', async () => {
  const source = [
    'export { Foo // comment',
    "} from './foo.js'",
    "export * from './short.js'",
  ].join('\n')

  await assertFormatted(
    source,
    ['export {', '  Foo, // comment', "} from './foo.js'", "export * from './short.js'", ''].join(
      '\n'
    )
  )
})

test('should keep trailing-commented export declarations outside source alignment', async () => {
  const source = [
    "export * from './a.js' // trailing comment that makes padding unsafe",
    "export { VeryLongName } from './x.js'",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "export * from './a.js' // trailing comment that makes padding unsafe",
      "export { VeryLongName } from './x.js'",
      '',
    ].join('\n')
  )
})

test('should respect bracket spacing when aligning named exports', async () => {
  const source = [
    "export * from './x.js'",
    "export type { LongerNamedType } from './types.js'",
  ].join('\n')
  const expected = [
    "export *                      from './x.js'",
    "export type {LongerNamedType} from './types.js'",
    '',
  ].join('\n')

  assert.equal(await formatTypeScript(source, { bracketSpacing: false }), expected)
  assert.equal(await formatTypeScript(expected, { bracketSpacing: false }), expected)
})

test('should keep source exports within print width after alignment padding', async () => {
  const source = [
    "export { VeryLongNamedType } from './types.js'",
    "export * from './very-long-source-module-name-that-would-overflow-after-padding.js'",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "export { VeryLongNamedType } from './types.js'",
      "export * from './very-long-source-module-name-that-would-overflow-after-padding.js'",
      '',
    ].join('\n')
  )
})

test('should count import attributes before aligning source declarations', async () => {
  const source = [
    "export { VeryLongName } from './x.js'",
    "export * from './foo.json' with { type: 'json' }",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "export { VeryLongName } from './x.js'",
      "export * from './foo.json' with { type: 'json' }",
      '',
    ].join('\n'),
    { printWidth: 50 }
  )
})

test('should leave unsupported import assertions out of source alignment', async () => {
  const source = [
    "export * from './short.js'",
    "export { VeryLongName } from './x.js'",
    "export * from './foo.json' assert { type: 'json' }",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "export *                from './short.js'",
      "export { VeryLongName } from './x.js'",
      "export * from './foo.json' assert { type: 'json' }",
      '',
    ].join('\n')
  )
})

test('should respect bracket spacing when counting import attributes', async () => {
  const source = [
    "export {LongerName} from './x.js'",
    "export * from './aaaaa.json' with { type: 'json' }",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "export {LongerName} from './x.js'",
      "export * from './aaaaa.json' with {type: 'json'}",
      '',
    ].join('\n'),
    { bracketSpacing: false, printWidth: 60 }
  )
})

test('should preserve quoted import attribute keys without source alignment', async () => {
  const source = [
    "export {LongerName} from './x.js'",
    "export * from './aaaaa.json' with { 'type': 'json' }",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "export {LongerName} from './x.js'",
      "export * from './aaaaa.json' with {'type': 'json'}",
      '',
    ].join('\n'),
    { bracketSpacing: false, printWidth: 60, quoteProps: 'preserve' }
  )
})

test('should count semicolons before aligning source declarations', async () => {
  const source = [
    "export { VeryLongName } from './x.js'",
    "export * from './aaaaaaaaaaaaaaaaaaaaaaaa.js'",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "export { VeryLongName } from './x.js';",
      "export * from './aaaaaaaaaaaaaaaaaaaaaaaa.js';",
      '',
    ].join('\n'),
    { printWidth: 60, semi: true }
  )
})

test('should align empty source export declarations', async () => {
  const source = [
    "export {} from './empty.js'",
    "export { VeryLongName } from './x.js'",
    "export * from './short.js'",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "export {}               from './empty.js'",
      "export { VeryLongName } from './x.js'",
      "export *                from './short.js'",
      '',
    ].join('\n')
  )
})

test('should align empty type source export declarations', async () => {
  const source = ["export type {} from './empty.js'", "export { VeryLongName } from './x.js'"].join(
    '\n'
  )

  await assertFormatted(
    source,
    ["export type {}          from './empty.js'", "export { VeryLongName } from './x.js'", ''].join(
      '\n'
    )
  )
})

test('should align empty source import declarations without aligning side-effect imports', async () => {
  const source = [
    "import './side-effect.js'",
    "import {} from './empty.js'",
    "import type {} from './types.js'",
    "import { VeryLongName } from './x.js'",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "import {}               from './empty.js'",
      "import './side-effect.js'",
      "import type {}          from './types.js'",
      '',
      "import { VeryLongName } from './x.js'",
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

test('should align imports that become single line after formatting', async () => {
  const source = [
    'import {',
    '  Foo,',
    "} from './foo.js'",
    "import { VeryLongName } from './x.js'",
  ].join('\n')

  await assertFormatted(
    source,
    ["import { Foo }          from './foo.js'", "import { VeryLongName } from './x.js'", ''].join(
      '\n'
    )
  )
})

test('should align namespace imports that become single line after formatting', async () => {
  const source = [
    'import * as',
    "  ns from './ns.js'",
    "import { VeryLongName } from './x.js'",
  ].join('\n')

  await assertFormatted(
    source,
    ["import * as ns          from './ns.js'", "import { VeryLongName } from './x.js'", ''].join(
      '\n'
    )
  )
})

test('should respect bracket spacing when aligning imports', async () => {
  const source = [
    "import { Foo } from './foo.js'",
    "import type { VeryLongName } from './x.js'",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "import type {VeryLongName} from './x.js'",
      '',
      "import {Foo}               from './foo.js'",
      '',
    ].join('\n'),
    { bracketSpacing: false }
  )
})

test('should keep source imports within print width after alignment padding', async () => {
  const source = [
    "import { Foo } from './long-enough-module.js'",
    "import { VeryLongName } from './x.js'",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "import { Foo } from './long-enough-module.js'",
      "import { VeryLongName } from './x.js'",
      '',
    ].join('\n'),
    { printWidth: 53 }
  )
})

test('should leave import declarations with attributes outside source alignment', async () => {
  const source = [
    "import { Foo } from './foo.js'",
    "import packageJson from '../package.json' with { type: 'json' }",
    "import { VeryLongName } from './x.js'",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "import { Foo }          from './foo.js'",
      "import { VeryLongName } from './x.js'",
      "import packageJson from '../package.json' with { type: 'json' }",
      '',
    ].join('\n')
  )
})

test('should align imports after normalizing module source quotes', async () => {
  const source = [
    'import * as ns from "./has\\"quote.js"',
    'import { VeryLongName } from "./x.js"',
  ].join('\n')

  await assertFormatted(
    source,
    [
      "import * as ns          from './has\"quote.js'",
      "import { VeryLongName } from './x.js'",
      '',
    ].join('\n'),
    { printWidth: 50 }
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

test('should align named exports after normalizing specifier spacing', async () => {
  const source = [
    "export {  Foo  } from './foo.js'",
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

test('should align exports after normalizing module source quotes', async () => {
  const source = ['export * from "./has\\"quote.js"', 'export { VeryLongName } from "./x.js"'].join(
    '\n'
  )

  await assertFormatted(
    source,
    [
      "export *                from './has\"quote.js'",
      "export { VeryLongName } from './x.js'",
      '',
    ].join('\n'),
    { printWidth: 45 }
  )
})

test('should align exports that become single line after formatting', async () => {
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

test('should not treat as inside export literal names as an explicit alias', async () => {
  const source = [
    "export { 'foo as bar' } from './literal.js'",
    "export { VeryLongName } from './x.js'",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "export { 'foo as bar' } from './literal.js'",
      "export { VeryLongName } from './x.js'",
      '',
    ].join('\n')
  )
})

test('should preserve explicit self aliases before source alignment', async () => {
  const source = [
    "export { foo as foo } from './foo.js'",
    "export { VeryLongName } from './x.js'",
  ].join('\n')

  await assertFormatted(
    source,
    ["export { foo as foo }   from './foo.js'", "export { VeryLongName } from './x.js'", ''].join(
      '\n'
    )
  )
})

test('should preserve explicit string literal self aliases before source alignment', async () => {
  const source = [
    "export { 'foo as bar' as 'foo as bar' } from './literal.js'",
    "export { VeryLongName } from './x.js'",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "export { 'foo as bar' as 'foo as bar' } from './literal.js'",
      "export { VeryLongName }                 from './x.js'",
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
