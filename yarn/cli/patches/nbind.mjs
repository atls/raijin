import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const before = ',_a=_typeModule(_typeModule),'
const after = ';var _a=_typeModule(_typeModule);'
const bundlePath = fileURLToPath(new URL('../bundles/yarn.mjs', import.meta.url))
const source = await readFile(bundlePath, 'utf8')

assert.equal(source.split(before).length - 1, 1)
assert.equal(source.includes(after), false)

const patched = source.replace(before, after)

assert.equal(patched.includes(before), false)
assert.equal(patched.split(after).length - 1, 1)

await writeFile(bundlePath, patched)
