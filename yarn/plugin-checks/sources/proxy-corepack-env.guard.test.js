import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import { stat } from 'node:fs/promises'
import { dirname } from 'node:path'
import { extname } from 'node:path'
import { join } from 'node:path'
import { relative } from 'node:path'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx'])

const TARGET_SOURCE_DIRS = [
  'yarn/plugin-typescript/sources',
  'yarn/plugin-lint/sources',
  'yarn/plugin-checks/sources',
  'yarn/plugin-test/sources',
  'yarn/plugin-library/sources',
  'yarn/plugin-service/sources',
  'yarn/plugin-ui/sources',
  'yarn/plugin-tools/sources',
  'yarn/plugin-renderer/sources',
]

const YARN_REENTRY_REGEXP =
  /\b(?:execUtils\.)?(?:pipevp|execvp)\(\s*['"]yarn['"]|\bspawn\(\s*['"]yarn['"]/g

const SCRIPT_ENV_REGEXP = /scriptUtils\.makeScriptEnv\(\s*\{[\s\S]*?\}\s*\)/g

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const getLine = (source, index) => source.slice(0, index).split('\n').length

const collectSourceFiles = async (dir) => {
  const entries = await readdir(dir)
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry)
      const pathStat = await stat(path)

      if (pathStat.isDirectory()) {
        return collectSourceFiles(path)
      }

      if (SOURCE_EXTENSIONS.has(extname(path))) {
        return [path]
      }

      return []
    })
  )

  return files.flat()
}

test('should keep yarn proxy re-entry calls isolated from Corepack', async () => {
  const sourceFiles = (
    await Promise.all(TARGET_SOURCE_DIRS.map((dir) => collectSourceFiles(join(repoRoot, dir))))
  ).flat()
  const sources = await Promise.all(
    sourceFiles.map(async (path) => ({
      path,
      source: await readFile(path, 'utf-8'),
    }))
  )

  const errors = []

  for (const { path, source } of sources) {
    const relativePath = relative(repoRoot, path)

    for (const match of source.matchAll(SCRIPT_ENV_REGEXP)) {
      if (!match[0].includes('ignoreCorepack: true')) {
        errors.push(
          `${relativePath}:${getLine(source, match.index ?? 0)} makeScriptEnv must set ignoreCorepack: true`
        )
      }
    }

    for (const match of source.matchAll(YARN_REENTRY_REGEXP)) {
      const line = getLine(source, match.index ?? 0)
      const reentryCall = source.slice(match.index ?? 0, (match.index ?? 0) + 800)

      if (!source.includes('scriptUtils.makeScriptEnv')) {
        errors.push(`${relativePath}:${line} yarn re-entry must use scriptUtils.makeScriptEnv`)
      }

      if (!source.includes('ignoreCorepack: true')) {
        errors.push(`${relativePath}:${line} yarn re-entry must set ignoreCorepack: true`)
      }

      if (!/env\s*(?:[:,}])/.test(reentryCall)) {
        errors.push(`${relativePath}:${line} yarn re-entry must pass env to the child process`)
      }
    }
  }

  assert.deepEqual(errors, [])
})
