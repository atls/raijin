import { readFile } from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const replacements = [
  {
    after: { from: 1, to: 1 },
    before: { from: 1, to: 0 },
    from: 'dynamicModule.children.indexOf(freshCacheEntry)',
    to: 'dynamicModule.children?dynamicModule.children.indexOf(freshCacheEntry):-1',
  },
  {
    after: { from: 0, to: 1 },
    before: { from: 1, to: 0 },
    from: ',_a=_typeModule(_typeModule),',
    to: ';var _a=_typeModule(_typeModule);',
  },
  {
    after: { from: 0, to: 1 },
    before: { from: 1, to: 0 },
    from: '}.cjs`),',
    to: '}.mjs`),',
  },
]

/**
 * @param {string} content
 * @param {string} value
 */
const countOccurrences = (content, value) => content.split(value).length - 1

const bundle = join(fileURLToPath(new URL('.', import.meta.url)), '../bundles/yarn.mjs')
const content = await readFile(bundle, 'utf-8')

const patched = replacements.reduce((result, replacement) => {
  assert.equal(countOccurrences(result, replacement.from), replacement.before.from)
  assert.equal(countOccurrences(result, replacement.to), replacement.before.to)

  const next = result.replace(replacement.from, replacement.to)

  assert.equal(countOccurrences(next, replacement.from), replacement.after.from)
  assert.equal(countOccurrences(next, replacement.to), replacement.after.to)

  return next
}, content)

await writeFile(bundle, patched)
