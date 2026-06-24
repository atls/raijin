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

test('should align source clauses in export barrel declarations', async () => {
  const source = [
    "export * from './constants.js'",
    "export type * from './interfaces.js'",
    "export { Foo } from './foo.js'",
    "export type { Foo } from './foo.interfaces.js'",
    'export const value = 1',
  ].join('\n')

  assert.equal(
    await formatTypeScript(source),
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

  assert.equal(await formatTypeScript(source), source)
})
