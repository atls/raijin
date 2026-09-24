import type { Config }       from 'prettier'

import assert                from 'node:assert/strict'
import { test }              from 'node:test'

import * as babel            from 'prettier/plugins/babel'
import * as estree           from 'prettier/plugins/estree'
import * as typescript       from 'prettier/plugins/typescript'
import { format }            from 'prettier/standalone'

import { createPlugin }      from '../index.js'
import { getPrettierPlugin } from '../index.js'
import defaultPlugin         from '../index.js'

const formatTypeScript = async (source: string, options: Partial<Config> = {}): Promise<string> => {
  const plugin = await createPlugin({ workspacePackageNames: [] })

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

test('should preserve the legacy plugin factory export', () => {
  assert.equal(getPrettierPlugin, createPlugin)
})

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
  const plugin = await createPlugin({ workspacePackageNames: ['@atls/yarn-plugin-format'] })
  const source = [
    "import { formatProjectSources } from '@atls/yarn-plugin-format'",
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
      "import { Project }              from '@yarnpkg/core'",
      '',
      "import { formatProjectSources } from '@atls/yarn-plugin-format'",
      '',
    ].join('\n')
  )
})

test('should preserve Yarn workspace classification for plugin defaults', async () => {
  const source = [
    "import { formatProjectSources } from '@atls/yarn-plugin-format'",
    "import { Project } from '@yarnpkg/core'",
  ].join('\n')
  const expected = [
    "import { Project }              from '@yarnpkg/core'",
    '',
    "import { formatProjectSources } from '@atls/yarn-plugin-format'",
    '',
  ].join('\n')

  const plugins = [defaultPlugin, await createPlugin()]
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

test('should keep empty source and side-effect imports in place', async () => {
  const source = [
    "import './side-effect.js'",
    "import {} from './empty.js'",
    "import type {} from './types.js'",
    "import { VeryLongName } from './x.js'",
  ].join('\n')

  await assertFormatted(
    source,
    [
      "import './side-effect.js'",
      "import {}               from './empty.js'",
      "import type {}          from './types.js'",
      "import { VeryLongName } from './x.js'",
      '',
    ].join('\n')
  )
})

test('should preserve side-effect import order while sorting following imports', async () => {
  const source = [
    "import './z-side-effect.js'",
    "import './a-side-effect.js'",
    "import { Zebra } from 'z'",
    "import { Alpha } from 'a'",
    'export const result = [Alpha, Zebra]',
  ].join('\n')
  const formatted = await formatTypeScript(source)

  assert.ok(formatted.indexOf("'./z-side-effect.js'") < formatted.indexOf("'./a-side-effect.js'"))
  assert.ok(formatted.indexOf("from 'a'") < formatted.indexOf("from 'z'"))
  assert.equal(await formatTypeScript(formatted), formatted)
})

test('should keep file-leading comments above the original first import', async () => {
  const source = [
    '/** @license example */',
    "import { Zebra } from 'z'",
    "import { Charlie } from 'c'",
    "import { Alpha } from 'a'",
    'export const result = [Alpha, Charlie, Zebra]',
  ].join('\n')
  const formatted = await formatTypeScript(source)

  assert.ok(formatted.startsWith('/** @license example */\n'))
  assert.ok(formatted.indexOf("from 'z'") < formatted.indexOf("from 'a'"))
  assert.ok(formatted.indexOf("from 'a'") < formatted.indexOf("from 'c'"))
  assert.equal(await formatTypeScript(formatted), formatted)
})

test('should leave commented imports in place and sort only a later clean run', async () => {
  const source = [
    "import { Zebra } from 'z'",
    '/* this describes Alpha */',
    "import { Alpha } from 'a'",
    "import { Delta } from 'd'",
    "import { Charlie } from 'c'",
    'export const result = [Alpha, Charlie, Delta, Zebra]',
  ].join('\n')
  const formatted = await formatTypeScript(source)

  assert.ok(formatted.indexOf("from 'z'") < formatted.indexOf('/* this describes Alpha */'))
  assert.ok(formatted.indexOf('/* this describes Alpha */') < formatted.indexOf("from 'a'"))
  assert.ok(formatted.indexOf("from 'a'") < formatted.indexOf("from 'c'"))
  assert.ok(formatted.indexOf("from 'c'") < formatted.indexOf("from 'd'"))
  assert.equal(await formatTypeScript(formatted), formatted)
})

test('should not sort imports across executable statements', async () => {
  const source = [
    "import { Zebra } from 'z'",
    'first()',
    "import { Charlie } from 'c'",
    "import { Alpha } from 'a'",
    'second()',
  ].join('\n')
  const formatted = await formatTypeScript(source)

  assert.ok(formatted.indexOf("from 'z'") < formatted.indexOf('first()'))
  assert.ok(formatted.indexOf('first()') < formatted.indexOf("from 'a'"))
  assert.ok(formatted.indexOf("from 'a'") < formatted.indexOf("from 'c'"))
  assert.ok(formatted.indexOf("from 'a'") < formatted.indexOf('second()'))
  assert.equal(await formatTypeScript(formatted), formatted)
})

test('should preserve quoted import names without lossy splitting', async () => {
  const source = [
    'import { "foo-bar" as fooBar, Other } from "pkg"',
    'export { fooBar, Other }',
  ].join('\n')
  const formatted = await formatTypeScript(source)

  assert.match(formatted, /['"]foo-bar['"] as fooBar/u)
  assert.equal(formatted.match(/from 'pkg'/gu)?.length, 1)
  assert.doesNotMatch(formatted, /undefined/u)
  assert.equal(await formatTypeScript(formatted), formatted)
})

test('should leave import attributes on their original declaration', async () => {
  const source = [
    "import { Zebra, Alpha } from './data.json' with { type: 'json' }",
    'export { Alpha, Zebra }',
  ].join('\n')
  const formatted = await formatTypeScript(source)

  assert.match(formatted, /with \{ type: 'json' \}/u)
  assert.equal(formatted.match(/from '.\/data.json'/gu)?.length, 1)
  assert.equal(await formatTypeScript(formatted), formatted)
})

test('should preserve braces inside a named import module specifier', async () => {
  const source = ["import { Alpha } from './{data}.js'", 'export { Alpha }'].join('\n')
  const formatted = await formatTypeScript(source)

  assert.match(formatted, /import \{ Alpha \} from '.\/\{data\}\.js'/u)
  assert.equal(await formatTypeScript(formatted), formatted)
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

test('should format split named imports and following code in one pass', async () => {
  const source = [
    "import './globals.css'",
    "import type { Metadata } from 'next'",
    "import { Geist, Geist_Mono } from 'next/font/google'",
    'export const metadata: Metadata = Geist(Geist_Mono)',
  ].join('\n')

  await assertFormatted(
    source,
    [
      "import './globals.css'",
      "import type { Metadata } from 'next'",
      '',
      "import { Geist }         from 'next/font/google'",
      "import { Geist_Mono }    from 'next/font/google'",
      'export const metadata: Metadata = Geist(Geist_Mono)',
      '',
    ].join('\n')
  )

  await assertFormatted(
    [
      "import { First, Second } from 'pkg'",
      "import { Third } from 'pkg'",
      'export const result = First(Second, Third)',
    ].join('\n'),
    [
      "import { First }  from 'pkg'",
      "import { Second } from 'pkg'",
      "import { Third }  from 'pkg'",
      'export const result = First(Second, Third)',
      '',
    ].join('\n')
  )

  await assertFormatted(
    [
      "import Default, { First, Second } from 'pkg'",
      'export const result = Default(First, Second)',
    ].join('\n'),
    [
      "import { First }  from 'pkg'",
      "import { Second } from 'pkg'",
      "import Default    from 'pkg'",
      'export const result = Default(First, Second)',
      '',
    ].join('\n')
  )

  await assertFormatted(
    ["import { First as one, type Second as two } from 'pkg'", 'export const result = one'].join(
      '\n'
    ),
    [
      "import { First as one }       from 'pkg'",
      "import { type Second as two } from 'pkg'",
      'export const result = one',
      '',
    ].join('\n')
  )
})

test('should keep directive comments on their unsplit import', async () => {
  const leading = await formatTypeScript(
    [
      '// eslint-disable-next-line',
      "import { First, Second } from 'pkg'",
      'export const value = First(Second)',
    ].join('\n')
  )

  assert.match(leading, /\/\/ eslint-disable-next-line\nimport \{ First, Second \} from 'pkg'/u)
  assert.equal(leading.match(/from 'pkg'/gu)?.length, 1)
  assert.equal(await formatTypeScript(leading), leading)

  const trailing = await formatTypeScript(
    [
      "import { First, Second } from 'pkg' // eslint-disable-line",
      'export const value = First(Second)',
    ].join('\n')
  )

  assert.match(trailing, /import \{ First, Second \} from 'pkg' \/\/ eslint-disable-line/u)
  assert.equal(trailing.match(/from 'pkg'/gu)?.length, 1)
  assert.equal(await formatTypeScript(trailing), trailing)

  const multiline = await formatTypeScript(
    [
      '/* eslint-disable-next-line @typescript-eslint/no-unused-vars',
      ' */',
      "import { First, Second } from 'pkg'",
      'export const value = First(Second)',
    ].join('\n')
  )

  assert.match(
    multiline,
    /\/\* eslint-disable-next-line @typescript-eslint\/no-unused-vars\n \*\/\nimport \{ First, Second \} from 'pkg'/u
  )
  assert.equal(multiline.match(/from 'pkg'/gu)?.length, 1)
  assert.equal(await formatTypeScript(multiline), multiline)

  const trailingMultiline = await formatTypeScript(
    [
      "import { First, Second } from 'pkg' /* eslint-disable-line",
      ' */',
      'export const value = First(Second)',
    ].join('\n')
  )

  assert.match(
    trailingMultiline,
    /import \{ First, Second \} from 'pkg' \/\* eslint-disable-line\n \*\//u
  )
  assert.equal(trailingMultiline.match(/from 'pkg'/gu)?.length, 1)
  assert.equal(await formatTypeScript(trailingMultiline), trailingMultiline)
})

test('should keep a multiline comment with the preceding statement when sorting imports', async () => {
  const source = [
    'const marker = true /* previous statement',
    ' */',
    "import { Zebra } from 'z'",
    "import { Alpha } from 'a'",
    'export { marker }',
  ].join('\n')
  const formatted = await formatTypeScript(source)

  assert.match(formatted, /const marker = true \/\* previous statement\n \*\/\n/u)
  assert.ok(formatted.indexOf("from 'z'") < formatted.indexOf("from 'a'"))
  assert.equal(await formatTypeScript(formatted), formatted)
})

test('should not move executable code with nearby import comments', async () => {
  const trailing = await formatTypeScript(
    [
      "import { Zebra } from 'z'; first() /* first effect",
      ' */',
      "import { Alpha } from 'a'; second() /* second effect",
      ' */',
      'export const result = [Alpha, Zebra]',
    ].join('\n')
  )

  assert.ok(trailing.indexOf("from 'z'") < trailing.indexOf("from 'a'"))
  assert.ok(trailing.indexOf('first()') < trailing.indexOf('second()'))
  assert.match(trailing, /first\(\) \/\* first effect\n \*\//u)
  assert.equal(await formatTypeScript(trailing), trailing)

  const leading = await formatTypeScript(
    [
      '/* first note',
      ' */ const first = sideEffect()',
      "import { Zebra } from 'z'",
      '/* second note',
      ' */ const second = sideEffect()',
      "import { Alpha } from 'a'",
      'export { first, second }',
    ].join('\n')
  )

  assert.ok(leading.indexOf("from 'z'") < leading.indexOf("from 'a'"))
  assert.ok(leading.indexOf('const first') < leading.indexOf('const second'))
  assert.equal(await formatTypeScript(leading), leading)
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
      "import packageJson from '../package.json' with { type: 'json' }",
      "import { VeryLongName } from './x.js'",
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
