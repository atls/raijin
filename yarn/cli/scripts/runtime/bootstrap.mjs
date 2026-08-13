import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import assemblyPackage from '../../package.json' with { type: 'json' }
import rootPackage from '../../../../package.json' with { type: 'json' }

const runtimePath = fileURLToPath(new URL('../../dist/runtime/yarn.mjs', import.meta.url))
const execute = promisify(execFile)
const cwd = await mkdtemp(join(tmpdir(), 'raijin-yarn-runtime-bootstrap-'))
const env = { ...process.env }
const yarnPlatformVersion = rootPackage.packageManager.replace(/^yarn@/, '')

assert.equal(assemblyPackage.version, yarnPlatformVersion)
assert.equal(assemblyPackage.dependencies['@yarnpkg/cli'], yarnPlatformVersion)

delete env.NODE_OPTIONS
delete env.NODE_PATH

try {
  const { stdout } = await execute(process.execPath, [runtimePath, '--version'], {
    cwd,
    encoding: 'utf8',
    env,
  })

  assert.equal(stdout.trim(), yarnPlatformVersion)
} finally {
  await rm(cwd, { recursive: true, force: true })
}
