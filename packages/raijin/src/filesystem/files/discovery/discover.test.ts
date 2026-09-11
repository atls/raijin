import type { PortablePath } from '@yarnpkg/fslib'

import assert                from 'node:assert/strict'
import { mkdir }             from 'node:fs/promises'
import { mkdtemp }           from 'node:fs/promises'
import { writeFile }         from 'node:fs/promises'
import { tmpdir }            from 'node:os'
import { join }              from 'node:path'
import { test }              from 'node:test'

import { npath }             from '@yarnpkg/fslib'
import { ppath }             from '@yarnpkg/fslib'

import { discoverFiles }     from './discover.js'

const createFixture = async (): Promise<PortablePath> => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-file-discovery-'))

  await mkdir(join(cwd, 'src'))
  await writeFile(join(cwd, '.config.ts'), 'export default {}\n')
  await writeFile(join(cwd, 'src', 'z.ts'), 'export const z = true\n')
  await writeFile(join(cwd, 'src', 'a.ts'), 'export const a = true\n')
  await writeFile(join(cwd, 'src', 'ignored.ts'), 'export const ignored = true\n')

  return npath.toPortablePath(cwd)
}

test('should discover dotfiles with ignores and stable absolute output', async () => {
  const cwd = await createFixture()

  assert.deepEqual(
    await discoverFiles({
      cwd,
      patterns: ['**/*.ts'],
      ignore: ['**/ignored.ts'],
      dot: true,
    }),
    [ppath.join(cwd, '.config.ts'), ppath.join(cwd, 'src/a.ts'), ppath.join(cwd, 'src/z.ts')]
  )
})

test('should accept absolute file patterns', async () => {
  const cwd = await createFixture()

  assert.deepEqual(
    await discoverFiles({
      cwd,
      patterns: [ppath.join(cwd, 'src/*.ts')],
      ignore: ['**/ignored.ts'],
    }),
    [ppath.join(cwd, 'src/a.ts'), ppath.join(cwd, 'src/z.ts')]
  )
})
