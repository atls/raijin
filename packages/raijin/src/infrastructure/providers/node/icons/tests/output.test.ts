import assert         from 'node:assert/strict'
import { copyFile }   from 'node:fs/promises'
import { lstat }      from 'node:fs/promises'
import { mkdir }      from 'node:fs/promises'
import { mkdtemp }    from 'node:fs/promises'
import { readFile }   from 'node:fs/promises'
import { readdir }    from 'node:fs/promises'
import { rm }         from 'node:fs/promises'
import { symlink }    from 'node:fs/promises'
import { writeFile }  from 'node:fs/promises'
import { tmpdir }     from 'node:os'
import { basename }   from 'node:path'
import { dirname }    from 'node:path'
import { join }       from 'node:path'
import { test }       from 'node:test'
import { setTimeout } from 'node:timers/promises'

import { create }     from '../output.js'

const resolveCaseInsensitive = async (path: string): Promise<string> => {
  const directory = dirname(path)
  const name = basename(path).toLowerCase()
  const match = (await readdir(directory)).find((entry) => entry.toLowerCase() === name)

  return match ? join(directory, match) : path
}

const copyCaseInsensitive = async (from: string, to: string): Promise<void> =>
  copyFile(from, await resolveCaseInsensitive(to))

const removeCaseInsensitive = async (path: string): Promise<void> =>
  rm(await resolveCaseInsensitive(path), { force: true })

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

test('should restore snapshots after an output removal fails', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-icon-output-'))
  const source = join(cwd, 'src')
  const previous = {
    bell: 'previous bell output',
    index: 'previous index',
    user: 'previous user output',
  }
  const failedRemoval = join(source, 'Bell.icon.tsx')

  try {
    await mkdir(source)
    await Promise.all([
      writeFile(join(source, 'Bell.icon.tsx'), previous.bell),
      writeFile(join(source, 'User.icon.tsx'), previous.user),
      writeFile(join(source, 'index.ts'), previous.index),
    ])

    const copy = async (from: string, to: string): Promise<void> => {
      if (to === join(source, 'User.icon.tsx')) {
        throw new Error('Injected icon copy failure')
      }

      await copyFile(from, to)
    }
    const remove = async (path: string): Promise<void> => {
      if (path === failedRemoval) {
        throw new Error('Injected icon removal failure')
      }

      await rm(path, { force: true })
    }

    await assert.rejects(
      create(copy, remove).replace(cwd, [
        { component: 'BellIcon', content: 'new bell output', name: 'Bell' },
        { component: 'UserIcon', content: 'new user output', name: 'User' },
      ]),
      { message: 'Icon output replacement rollback failed' }
    )

    assert.equal(await readFile(join(source, 'Bell.icon.tsx'), 'utf8'), previous.bell)
    assert.equal(await readFile(join(source, 'User.icon.tsx'), 'utf8'), previous.user)
    assert.equal(await readFile(join(source, 'index.ts'), 'utf8'), previous.index)
  } finally {
    await rm(cwd, { force: true, recursive: true })
  }
})

test('should preserve a generated module renamed only by case', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-icon-output-'))
  const source = join(cwd, 'src')

  try {
    await mkdir(source)
    await writeFile(join(source, 'alert.icon.tsx'), 'previous alert output')

    const files = await create(copyCaseInsensitive, removeCaseInsensitive).replace(cwd, [
      { component: 'AlertIcon', content: 'export const AlertIcon = null\n', name: 'Alert' },
    ])

    assert.deepEqual(files, ['src/Alert.icon.tsx', 'src/index.ts'])
    assert.deepEqual((await readdir(source)).sort(), ['Alert.icon.tsx', 'index.ts'])
    assert.equal(
      await readFile(join(source, 'Alert.icon.tsx'), 'utf8'),
      'export const AlertIcon = null\n'
    )
    assert.equal(
      await readFile(join(source, 'index.ts'), 'utf8'),
      "export * from './Alert.icon.jsx'"
    )
  } finally {
    await rm(cwd, { force: true, recursive: true })
  }
})

test('should restore exact casing after a later copy fails', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-icon-output-'))
  const source = join(cwd, 'src')

  const copy = async (from: string, to: string): Promise<void> => {
    if (basename(to) === 'index.ts') {
      throw new Error('Injected index copy failure')
    }

    await copyFile(from, await resolveCaseInsensitive(to))
  }

  try {
    await mkdir(source)
    await Promise.all([
      writeFile(join(source, 'alert.icon.tsx'), 'previous alert output'),
      writeFile(join(source, 'index.ts'), 'previous index'),
    ])

    await assert.rejects(
      create(copy, removeCaseInsensitive).replace(cwd, [
        { component: 'AlertIcon', content: 'new alert output', name: 'Alert' },
      ]),
      { message: 'Injected index copy failure' }
    )

    assert.deepEqual((await readdir(source)).sort(), ['alert.icon.tsx', 'index.ts'])
    assert.equal(await readFile(join(source, 'alert.icon.tsx'), 'utf8'), 'previous alert output')
    assert.equal(await readFile(join(source, 'index.ts'), 'utf8'), 'previous index')
  } finally {
    await rm(cwd, { force: true, recursive: true })
  }
})

test('should restore managed output with noncanonical suffix and index casing', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-icon-output-'))
  const source = join(cwd, 'src')
  const previous = {
    alert: 'previous alert output',
    index: 'previous index',
    manual: 'manual source',
  }

  const copy = async (from: string, to: string): Promise<void> => {
    if (basename(to) === 'User.icon.tsx') {
      throw new Error('Injected user copy failure')
    }

    await copyFile(from, await resolveCaseInsensitive(to))
  }

  try {
    await mkdir(source)
    await Promise.all([
      writeFile(join(source, 'Alert.Icon.tsx'), previous.alert),
      writeFile(join(source, 'Index.ts'), previous.index),
      writeFile(join(source, 'manual.ts'), previous.manual),
    ])

    await assert.rejects(
      create(copy, removeCaseInsensitive).replace(cwd, [
        { component: 'AlertIcon', content: 'new alert output', name: 'Alert' },
        { component: 'UserIcon', content: 'new user output', name: 'User' },
      ]),
      { message: 'Injected user copy failure' }
    )

    assert.deepEqual((await readdir(source)).sort(), ['Alert.Icon.tsx', 'Index.ts', 'manual.ts'])
    assert.equal(await readFile(join(source, 'Alert.Icon.tsx'), 'utf8'), previous.alert)
    assert.equal(await readFile(join(source, 'Index.ts'), 'utf8'), previous.index)
    assert.equal(await readFile(join(source, 'manual.ts'), 'utf8'), previous.manual)
  } finally {
    await rm(cwd, { force: true, recursive: true })
  }
})

test('should canonicalize managed output suffix and index casing', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-icon-output-'))
  const source = join(cwd, 'src')

  try {
    await mkdir(source)
    await Promise.all([
      writeFile(join(source, 'Alert.Icon.tsx'), 'previous alert output'),
      writeFile(join(source, 'Index.ts'), 'previous index'),
      writeFile(join(source, 'manual.ts'), 'manual source'),
    ])

    const files = await create(copyCaseInsensitive, removeCaseInsensitive).replace(cwd, [
      { component: 'AlertIcon', content: 'new alert output', name: 'Alert' },
    ])

    assert.deepEqual(files, ['src/Alert.icon.tsx', 'src/index.ts'])
    assert.deepEqual((await readdir(source)).sort(), ['Alert.icon.tsx', 'index.ts', 'manual.ts'])
    assert.equal(await readFile(join(source, 'Alert.icon.tsx'), 'utf8'), 'new alert output')
    assert.equal(
      await readFile(join(source, 'index.ts'), 'utf8'),
      "export * from './Alert.icon.jsx'"
    )
    assert.equal(await readFile(join(source, 'manual.ts'), 'utf8'), 'manual source')
  } finally {
    await rm(cwd, { force: true, recursive: true })
  }
})

test('should remove a newly created output boundary after replacement fails', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-icon-output-'))
  const source = join(cwd, 'src')
  const copy = async (from: string, to: string): Promise<void> => {
    if (basename(to) === 'User.icon.tsx') {
      throw new Error('Injected user copy failure')
    }

    await copyFile(from, to)
  }

  try {
    await assert.rejects(
      create(copy).replace(cwd, [
        { component: 'AlertIcon', content: 'new alert output', name: 'Alert' },
        { component: 'UserIcon', content: 'new user output', name: 'User' },
      ]),
      { message: 'Injected user copy failure' }
    )

    await assert.rejects(lstat(source), { code: 'ENOENT' })
  } finally {
    await rm(cwd, { force: true, recursive: true })
  }
})

test('should reject a linked generated output before mutation', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-icon-output-'))
  const source = join(cwd, 'src')
  const external = join(cwd, 'shared-alert.tsx')
  const linked = join(source, 'Alert.icon.tsx')

  try {
    await mkdir(source)
    await Promise.all([
      writeFile(external, 'external alert output'),
      writeFile(join(source, 'Stale.icon.tsx'), 'stale output'),
      writeFile(join(source, 'manual.ts'), 'manual source'),
    ])
    await symlink(external, linked)

    await assert.rejects(
      create().replace(cwd, [
        { component: 'AlertIcon', content: 'new alert output', name: 'Alert' },
      ]),
      { message: 'Managed icon output path must be a regular file: Alert.icon.tsx' }
    )

    assert.equal((await lstat(linked)).isSymbolicLink(), true)
    assert.equal(await readFile(external, 'utf8'), 'external alert output')
    assert.equal(await readFile(join(source, 'Stale.icon.tsx'), 'utf8'), 'stale output')
    assert.equal(await readFile(join(source, 'manual.ts'), 'utf8'), 'manual source')
    await assert.rejects(readFile(join(source, 'index.ts')), { code: 'ENOENT' })
  } finally {
    await rm(cwd, { force: true, recursive: true })
  }
})

test('should reject a linked output boundary before mutation', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-icon-output-'))
  const external = await mkdtemp(join(tmpdir(), 'raijin-icon-output-external-'))
  const source = join(cwd, 'src')

  try {
    await Promise.all([
      writeFile(join(external, 'Stale.icon.tsx'), 'external stale output'),
      writeFile(join(external, 'manual.ts'), 'external manual source'),
    ])
    await symlink(external, source, 'junction')

    await assert.rejects(
      create().replace(cwd, [
        { component: 'AlertIcon', content: 'new alert output', name: 'Alert' },
      ]),
      { message: 'Managed icon output boundary must be a directory: src' }
    )

    assert.equal((await lstat(source)).isSymbolicLink(), true)
    assert.equal(await readFile(join(external, 'Stale.icon.tsx'), 'utf8'), 'external stale output')
    assert.equal(await readFile(join(external, 'manual.ts'), 'utf8'), 'external manual source')
    await assert.rejects(readFile(join(external, 'Alert.icon.tsx')), { code: 'ENOENT' })
    await assert.rejects(readFile(join(external, 'index.ts')), { code: 'ENOENT' })
  } finally {
    await Promise.all([
      rm(cwd, { force: true, recursive: true }),
      rm(external, { force: true, recursive: true }),
    ])
  }
})

test('should reject a non-directory output boundary before mutation', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-icon-output-'))
  const source = join(cwd, 'src')

  try {
    await writeFile(source, 'existing source entry')

    await assert.rejects(
      create().replace(cwd, [
        { component: 'AlertIcon', content: 'new alert output', name: 'Alert' },
      ])
    )

    assert.equal(await readFile(source, 'utf8'), 'existing source entry')
  } finally {
    await rm(cwd, { force: true, recursive: true })
  }
})

test('should reject a non-regular managed output before mutation', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-icon-output-'))
  const source = join(cwd, 'src')

  try {
    await mkdir(join(source, 'Alert.icon.tsx'), { recursive: true })
    await Promise.all([
      writeFile(join(source, 'Stale.icon.tsx'), 'stale output'),
      writeFile(join(source, 'manual.ts'), 'manual source'),
    ])

    await assert.rejects(
      create().replace(cwd, [
        { component: 'AlertIcon', content: 'new alert output', name: 'Alert' },
      ]),
      { message: 'Managed icon output path must be a regular file: Alert.icon.tsx' }
    )

    assert.equal((await lstat(join(source, 'Alert.icon.tsx'))).isDirectory(), true)
    assert.equal(await readFile(join(source, 'Stale.icon.tsx'), 'utf8'), 'stale output')
    assert.equal(await readFile(join(source, 'manual.ts'), 'utf8'), 'manual source')
    await assert.rejects(readFile(join(source, 'index.ts')), { code: 'ENOENT' })
  } finally {
    await rm(cwd, { force: true, recursive: true })
  }
})
