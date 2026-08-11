import assert         from 'node:assert/strict'
import { copyFile }   from 'node:fs/promises'
import { mkdir }      from 'node:fs/promises'
import { mkdtemp }    from 'node:fs/promises'
import { readFile }   from 'node:fs/promises'
import { rm }         from 'node:fs/promises'
import { writeFile }  from 'node:fs/promises'
import { tmpdir }     from 'node:os'
import { join }       from 'node:path'
import { test }       from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { create }     from '../output.js'

test('should replace generated modules and index while preserving unrelated source files', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-icon-output-'))
  const source = join(cwd, 'src')

  try {
    await mkdir(source)
    await Promise.all([
      writeFile(join(source, 'Stale.icon.tsx'), 'stale output'),
      writeFile(join(source, 'Bell.icon.tsx'), 'previous bell output'),
      writeFile(join(source, 'manual.tsx'), 'manual source'),
      writeFile(join(source, 'keep.ts'), 'unrelated source'),
    ])

    const files = await create().replace(cwd, [
      { component: 'BellIcon', content: 'export const BellIcon = null\n', name: 'Bell' },
      { component: 'UserIcon', content: 'export const UserIcon = null\n', name: 'User' },
    ])

    assert.deepEqual(files, ['src/Bell.icon.tsx', 'src/User.icon.tsx', 'src/index.ts'])
    assert.equal(
      await readFile(join(source, 'Bell.icon.tsx'), 'utf8'),
      'export const BellIcon = null\n'
    )
    assert.equal(
      await readFile(join(source, 'User.icon.tsx'), 'utf8'),
      'export const UserIcon = null\n'
    )
    assert.equal(
      await readFile(join(source, 'index.ts'), 'utf8'),
      "export * from './Bell.icon.jsx'\nexport * from './User.icon.jsx'"
    )
    await assert.rejects(readFile(join(source, 'Stale.icon.tsx')), { code: 'ENOENT' })
    assert.equal(await readFile(join(source, 'manual.tsx'), 'utf8'), 'manual source')
    assert.equal(await readFile(join(source, 'keep.ts'), 'utf8'), 'unrelated source')
  } finally {
    await rm(cwd, { force: true, recursive: true })
  }
})

test('should settle pending file mutations before restoring previous output', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-icon-output-'))
  const source = join(cwd, 'src')
  const previous = {
    bell: 'previous bell output',
    index: 'previous index',
    user: 'previous user output',
  }

  try {
    await mkdir(source)
    await Promise.all([
      writeFile(join(source, 'Bell.icon.tsx'), previous.bell),
      writeFile(join(source, 'User.icon.tsx'), previous.user),
      writeFile(join(source, 'index.ts'), previous.index),
    ])

    const delayedIndex = join(source, 'index.ts')
    const failedUser = join(source, 'User.icon.tsx')
    const copy = async (from: string, to: string): Promise<void> => {
      if (to === failedUser) {
        throw new Error('Injected icon copy failure')
      }

      if (to === delayedIndex) {
        await setTimeout(50)
      }

      await copyFile(from, to)
    }

    await assert.rejects(
      create(copy).replace(cwd, [
        { component: 'BellIcon', content: 'new bell output', name: 'Bell' },
        { component: 'UserIcon', content: 'new user output', name: 'User' },
      ]),
      { message: 'Injected icon copy failure' }
    )
    await setTimeout(100)

    assert.equal(await readFile(join(source, 'Bell.icon.tsx'), 'utf8'), previous.bell)
    assert.equal(await readFile(join(source, 'User.icon.tsx'), 'utf8'), previous.user)
    assert.equal(await readFile(join(source, 'index.ts'), 'utf8'), previous.index)
  } finally {
    await rm(cwd, { force: true, recursive: true })
  }
})
