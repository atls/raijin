import assert            from 'node:assert/strict'
import { mkdtempSync }   from 'node:fs'
import { rmSync }        from 'node:fs'
import { writeFileSync } from 'node:fs'
import { tmpdir }        from 'node:os'
import { join }          from 'node:path'
import { test }          from 'node:test'
import { pathToFileURL } from 'node:url'

import { resolve }       from '../src/ts-ext-register.js'

const createContext = (parentPath: string) => {
  return {
    parentURL: pathToFileURL(parentPath).href,
  } as never
}

test('should resolve css imports to css.ts source', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'ts-ext-register-'))
  const parentPath = join(workspace, 'entry.ts')

  try {
    writeFileSync(join(workspace, 'global.css.ts'), 'export const style = {}', 'utf-8')

    const actual = resolve(
      './global.css',
      createContext(parentPath),
      (specifier) => ({ format: 'module', url: specifier }) as never
    ) as { url: string }

    assert.equal(actual.url, './global.css.ts')
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
})

test('should resolve css imports to css source if css.ts is absent', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'ts-ext-register-'))
  const parentPath = join(workspace, 'entry.ts')

  try {
    writeFileSync(join(workspace, 'global.css'), 'body {}', 'utf-8')

    const actual = resolve(
      './global.css',
      createContext(parentPath),
      (specifier) => ({ format: 'module', url: specifier }) as never
    ) as { url: string }

    assert.equal(actual.url, './global.css')
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
})

test('should keep original specifier if css source is absent', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'ts-ext-register-'))
  const parentPath = join(workspace, 'entry.ts')

  try {
    const actual = resolve(
      './missing.css',
      createContext(parentPath),
      (specifier) => ({ format: 'module', url: specifier }) as never
    ) as { url: string }

    assert.equal(actual.url, './missing.css')
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
})
