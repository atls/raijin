import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const expectedPath = fileURLToPath(new URL('./expected', import.meta.url))
const fixturePath = fileURLToPath(new URL('./fixture/packages/generated', import.meta.url))

/** @param {string} target */
export const verifyProjectGeneration = async (target) => {
  const expected = (await readdir(expectedPath)).map((path) => path.replace(/\.fixture$/u, ''))
  const entries = await readdir(target, { recursive: true, withFileTypes: true })
  const actual = entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(target, join(entry.parentPath, entry.name)))

  assert.deepEqual(
    actual.sort(),
    [...expected, '.gitignore', '.github/workflows/user.yaml', 'package.json'].sort(),
    'Unexpected generated scaffold files'
  )

  await Promise.all(
    expected.map(async (path) => {
      const content = await readFile(join(target, path), 'utf8')
      const fixture = await readFile(join(expectedPath, `${path}.fixture`), 'utf8')

      if (path === 'tsconfig.json') {
        assert.deepEqual(JSON.parse(content), JSON.parse(fixture))
      } else {
        assert.equal(content, fixture, path)
      }
    })
  )

  await Promise.all(
    ['.gitignore', '.github/workflows/user.yaml', 'package.json'].map(async (path) => {
      assert.equal(
        await readFile(join(target, path), 'utf8'),
        await readFile(
          join(fixturePath, path === 'package.json' ? 'package.json.fixture' : path),
          'utf8'
        ),
        path
      )
    })
  )
}
