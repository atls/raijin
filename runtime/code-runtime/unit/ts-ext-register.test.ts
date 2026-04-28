import assert            from 'node:assert/strict'
import { mkdtemp }       from 'node:fs/promises'
import { rm }            from 'node:fs/promises'
import { writeFile }     from 'node:fs/promises'
import { tmpdir }        from 'node:os'
import { join }          from 'node:path'
import { test }          from 'node:test'
import { pathToFileURL } from 'node:url'

import { resolve }       from '../src/ts-ext-register.js'

const createContext = (parentPath: string) =>
  ({
    parentURL: pathToFileURL(parentPath).href,
  }) as never

test('should resolve css imports to css.ts source', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'ts-ext-register-'))
  const parentPath = join(workspace, 'entry.ts')

  try {
    await writeFile(join(workspace, 'global.css.ts'), 'export const style = {}', 'utf-8')

    const actual = resolve(
      './global.css',
      createContext(parentPath),
      (specifier) => ({ format: 'module', url: specifier }) as never
    ) as { url: string }

    assert.equal(actual.url, './global.css.ts')
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test('should resolve css imports to css source if css.ts is absent', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'ts-ext-register-'))
  const parentPath = join(workspace, 'entry.ts')

  try {
    await writeFile(join(workspace, 'global.css'), 'body {}', 'utf-8')

    const actual = resolve(
      './global.css',
      createContext(parentPath),
      (specifier) => ({ format: 'module', url: specifier }) as never
    ) as { url: string }

    assert.equal(actual.url, './global.css')
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test('should keep original specifier if css source is absent', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'ts-ext-register-'))
  const parentPath = join(workspace, 'entry.ts')

  try {
    const actual = resolve(
      './missing.css',
      createContext(parentPath),
      (specifier) => ({ format: 'module', url: specifier }) as never
    ) as { url: string }

    assert.equal(actual.url, './missing.css')
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})
