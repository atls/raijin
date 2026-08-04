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
import ts from 'typescript'

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx'])

const TARGET_SOURCE_DIRS = ['yarn']

const YARN_LITERAL_REENTRY_REGEXP =
  /\b(?:execUtils\.)?(?:pipevp|execvp)\(\s*['"]yarn['"]|\bspawn\(\s*['"]yarn['"]/g

const SCRIPT_ENV_REGEXP = /scriptUtils\.makeScriptEnv\(\s*\{[\s\S]*?\}\s*\)/g
const COMMAND_IMPORT_REENTRANT_HELPER_REGEXP =
  /import\s*\{[^}]*\b(?:createChildProcessOptions|executeChildProcess|executeYarnCommand|spawnChildProcess|waitForChildProcess|createYarnExecutable|proxyProjectCommand|proxyWorkspaceCommand|shouldProxyCommand)\b[^}]*\}\s*from\s*['"]@atls\/raijin\/commands['"]/g
const PROXY_ENV_REGEXP = /RAIJIN_COMMAND_(?:PROXY_EXECUTION|INVOCATION_CWD)/g
const COMMAND_PATHS_REGEXP = /static\s+override\s+paths\s*=/g
const COMMAND_HANDLER_REGEXP = /\bexecute(?:Entry|Project|Workspace)\s*\(/g
const YARN_EXECUTION_OWNER = 'yarn/raijin/src/commands/invocation/adapters/yarn/execution.ts'
const PROCESS_EXECUTION_OWNER = 'yarn/raijin/src/commands/invocation/adapters/child-process.ts'
const NON_COMMAND_PROCESS_OWNERS = new Set([
  'yarn/plugin-tools/sources/hooks/after-all-installed.hook.ts',
])
const PROCESS_EXECUTION_MODULES = new Set([
  'child_process',
  'cross-spawn',
  'execa',
  'node:child_process',
])

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const getLine = (source, index) => source.slice(0, index).split('\n').length

const getCallPath = (expression) => {
  if (ts.isIdentifier(expression)) {
    return expression.text
  }

  if (ts.isPropertyAccessExpression(expression)) {
    const parentPath = getCallPath(expression.expression)

    return parentPath ? `${parentPath}.${expression.name.text}` : expression.name.text
  }

  return undefined
}

const getPropertyName = (property) => {
  if (!property.name) return undefined
  if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) return property.name.text

  return undefined
}

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
    const isProcessExecutionOwner = relativePath === PROCESS_EXECUTION_OWNER
    const isNonCommandProcessOwner = NON_COMMAND_PROCESS_OWNERS.has(relativePath)
    const hasCommandClass = source.match(COMMAND_PATHS_REGEXP) !== null
    const sourceFile = ts.createSourceFile(
      relativePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      relativePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    )

    const inspectNode = (node) => {
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        PROCESS_EXECUTION_MODULES.has(node.moduleSpecifier.text) &&
        !isProcessExecutionOwner &&
        !isNonCommandProcessOwner
      ) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1

        errors.push(`${relativePath}:${line} command process execution must use invocation.child`)
      }

      if (ts.isCallExpression(node)) {
        const callPath = getCallPath(node.expression)
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1

        if (callPath?.match(/(?:^|\.)yarn\.execute$/)) {
          const options = node.arguments.at(1)

          if (options && ts.isObjectLiteralExpression(options)) {
            const rawStreamOption = options.properties.find((property) =>
              ['stderr', 'stdin', 'stdio', 'stdout'].includes(getPropertyName(property) ?? '')
            )

            if (rawStreamOption) {
              errors.push(
                `${relativePath}:${line} nested Yarn execution must use invocation-bound streams`
              )
            }
          }
        }

        if (callPath?.match(/(?:^|\.)child\.(?:spawn|wait)$/)) {
          errors.push(
            `${relativePath}:${line} child execution must use the complete invocation lifecycle`
          )
        }

        if (callPath?.match(/(?:^|\.)yarn\.createExecutable$/)) {
          errors.push(
            `${relativePath}:${line} Yarn executable assembly must stay inside command invocation`
          )
        }

        if (callPath === 'execUtils.pipevp' || callPath === 'execUtils.execvp') {
          errors.push(
            `${relativePath}:${line} command process execution must use the invocation owner`
          )
        }
      }

      ts.forEachChild(node, inspectNode)
    }

    inspectNode(sourceFile)

    if (isProcessExecutionOwner) {
      if (!source.includes("from 'execa'")) {
        errors.push(`${relativePath}:1 process execution owner must use Execa`)
      }

      if (source.includes("from 'node:child_process'") || source.includes("from 'cross-spawn'")) {
        errors.push(`${relativePath}:1 process execution owner must not use low-level runners`)
      }
    }

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

    if (relativePath !== PROCESS_EXECUTION_OWNER) {
      for (const match of source.matchAll(PROXY_ENV_REGEXP)) {
        errors.push(
          `${relativePath}:${getLine(source, match.index ?? 0)} command proxy environment must not be used`
        )
      }
    }

    if (relativePath.startsWith('yarn/plugin-') && hasCommandClass) {
      const handlers = source.match(COMMAND_HANDLER_REGEXP) ?? []

      if (handlers.length !== 1) {
        errors.push(`${relativePath}:1 command class must implement exactly one invocation handler`)
      }

      if (source.includes('async execute(') || source.includes('extends BaseCommand')) {
        errors.push(`${relativePath}:1 command execution must be owned by RaijinCommand`)
      }

      if (source.includes('Command invocation context is missing')) {
        errors.push(`${relativePath}:1 command invocation must be guaranteed by RaijinCommand`)
      }
    }
  }

  assert.deepEqual(errors, [])
})
