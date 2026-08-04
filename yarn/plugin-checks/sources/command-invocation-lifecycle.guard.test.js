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

const TARGET_SOURCE_DIRS = ['yarn']

const YARN_LITERAL_REENTRY_REGEXP =
  /\b(?:execUtils\.)?(?:pipevp|execvp)\(\s*['"]yarn['"]|\bspawn\(\s*['"]yarn['"]/g

const SCRIPT_ENV_REGEXP = /scriptUtils\.makeScriptEnv\(\s*\{[\s\S]*?\}\s*\)/g
const COMMAND_IMPORT_REENTRANT_HELPER_REGEXP =
  /import\s*\{[^}]*\b(?:createChildProcessOptions|waitForChildProcess|createYarnExecutable|executeYarnCommand|proxyProjectCommand|proxyWorkspaceCommand|shouldProxyCommand)\b[^}]*\}\s*from\s*['"]@atls\/raijin\/commands['"]/g
const PROXY_ENV_REGEXP = /RAIJIN_COMMAND_(?:PROXY_EXECUTION|INVOCATION_CWD)/g
const COMMAND_PATHS_REGEXP = /static\s+override\s+paths\s*=/g
const YARN_EXECUTION_OWNER = 'yarn/raijin/src/commands/invocation/adapters/yarn/execution.ts'
const CHILD_PROCESS_OWNER = 'yarn/raijin/src/commands/invocation/adapters/child-process.ts'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const getLine = (source, index) => source.slice(0, index).split('\n').length

const isCommandFacingSource = (relativePath) =>
  relativePath.startsWith('yarn/plugin-') ||
  relativePath.startsWith('yarn/cli/src/') ||
  relativePath.startsWith('yarn/raijin/src/commands/')

const collectSourceFiles = async (dir) => {
  const entries = await readdir(dir)
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry)
      const pathStat = await stat(path)

      if (pathStat.isDirectory()) {
        return collectSourceFiles(path)
      }

      if (
        SOURCE_EXTENSIONS.has(extname(path)) &&
        !path.endsWith('.test.ts') &&
        !path.endsWith('.test.tsx')
      ) {
        return [path]
      }

      return []
    })
  )

  return files.flat()
}

test('should keep command invocation lifecycle in the invocation owner', async () => {
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

    if (!isCommandFacingSource(relativePath)) {
      continue
    }

    const isInvocationOwner = relativePath.startsWith('yarn/raijin/src/commands/invocation/')

    if (relativePath !== YARN_EXECUTION_OWNER) {
      for (const match of source.matchAll(SCRIPT_ENV_REGEXP)) {
        errors.push(
          `${relativePath}:${getLine(source, match.index ?? 0)} Yarn executable must be assembled by command invocation`
        )
      }
    } else {
      for (const match of source.matchAll(SCRIPT_ENV_REGEXP)) {
        if (!match[0].includes('ignoreCorepack: true')) {
          errors.push(
            `${relativePath}:${getLine(source, match.index ?? 0)} Yarn executable must avoid nested Corepack re-entry`
          )
        }
      }
    }

    for (const match of source.matchAll(YARN_LITERAL_REENTRY_REGEXP)) {
      const line = getLine(source, match.index ?? 0)

      errors.push(`${relativePath}:${line} Yarn command execution must use invocation.yarn`)
    }

    if (!isInvocationOwner) {
      for (const match of source.matchAll(COMMAND_IMPORT_REENTRANT_HELPER_REGEXP)) {
        errors.push(
          `${relativePath}:${getLine(source, match.index ?? 0)} command-facing code must not import invocation adapters or proxy helpers`
        )
      }
    }

    if (relativePath !== CHILD_PROCESS_OWNER) {
      for (const match of source.matchAll(PROXY_ENV_REGEXP)) {
        errors.push(
          `${relativePath}:${getLine(source, match.index ?? 0)} command proxy environment must not be used`
        )
      }
    }

    if (
      relativePath.startsWith('yarn/plugin-') &&
      source.match(COMMAND_PATHS_REGEXP) &&
      !source.includes('static raijinCommand = defineCommandInvocation')
    ) {
      errors.push(`${relativePath}:1 command class must declare a Raijin invocation scope`)
    }
  }

  assert.deepEqual(errors, [])
})
