import assert from 'node:assert/strict'
import { appendFile, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const [owner, ...files] = process.argv.slice(2)
const manifest = JSON.parse(await readFile('package.json', 'utf8'))

assert.equal(manifest.name, owner)
assert.ok(files.length > 0)

await Promise.all(
  files.map(async (file) => {
    assert.ok(!relative(process.cwd(), file).startsWith('..'))
    const contents = await readFile(file, 'utf8')
    assert.doesNotMatch(contents, /INVALID/)
    assert.doesNotMatch(contents, /UNSTAGED/)
    await writeFile(file, contents.replaceAll('unformatted', 'formatted'))
  })
)

await appendFile(
  join(owner === 'backend' ? '.' : '..', '.checks.jsonl'),
  `${JSON.stringify({ owner, cwd: process.cwd(), files })}\n`
)
