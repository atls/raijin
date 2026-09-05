import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

await Promise.all(
  process.argv.slice(2).map(async (file) => {
    assert.equal(await readFile(file, 'utf8'), 'formatted staged\n')
  })
)
