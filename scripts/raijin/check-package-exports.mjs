import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const [workspaceArgument, archiveArgument] = process.argv.slice(2)

if (!workspaceArgument || !archiveArgument) {
  throw new Error('Usage: check-package-exports.mjs <workspace> <package-archive>')
}

const cwd = process.cwd()
const workspacePath = path.resolve(cwd, workspaceArgument)
const archivePath = path.resolve(cwd, archiveArgument)
const packageJsonPath = path.join(workspacePath, 'package.json')
const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'))

const collectStringValues = (value, values = new Set()) => {
  if (typeof value === 'string') {
    values.add(value)
    return values
  }

  if (Array.isArray(value)) {
    for (const item of value) collectStringValues(item, values)
    return values
  }

  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStringValues(item, values)
  }

  return values
}

const normalizePackagePath = (value) => value.replace(/^\.\/?/, '')

const archiveEntries = new Set(
  execFileSync('tar', ['-tzf', archivePath], { encoding: 'utf8' }).split('\n').filter(Boolean)
)

const exportTargets = [...collectStringValues(packageJson.publishConfig?.exports ?? {})]
  .filter((value) => value.startsWith('./'))
  .map(normalizePackagePath)
  .sort((left, right) => left.localeCompare(right))

assert.ok(exportTargets.length > 0, `${packageJsonPath} has no publishConfig export targets`)

const missingTargets = exportTargets.filter((target) => !archiveEntries.has(`package/${target}`))

assert.deepEqual(
  missingTargets,
  [],
  `Package archive is missing publishConfig export targets:\n${missingTargets.join('\n')}`
)

console.log(`Package exports check passed (${exportTargets.length} targets)`)
