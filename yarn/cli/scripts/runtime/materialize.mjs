import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { copyFile } from 'node:fs/promises'
import { mkdtemp } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import cliPackage from '@yarnpkg/cli/package.json' with { type: 'json' }

import assemblyPackage from '../../package.json' with { type: 'json' }
import rootPackage from '../../../../package.json' with { type: 'json' }

const execute = promisify(execFile)
const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url))
const runtimePath = fileURLToPath(new URL('../../dist/runtime/yarn.mjs', import.meta.url))
const checkedRuntimePath = join(repoRoot, '.yarn/releases/yarn.mjs')
const fixtureCwd = await mkdtemp(join(tmpdir(), 'raijin-runtime-materialize-'))
const environment = { ...process.env }
const yarnPlatformVersion = rootPackage.packageManager.replace(/^yarn@/, '')

assert.equal(assemblyPackage.dependencies['@yarnpkg/cli'], yarnPlatformVersion)
assert.equal(cliPackage.version, yarnPlatformVersion)

delete environment.NODE_OPTIONS
delete environment.NODE_PATH
delete environment.YARN_VERSION
delete environment.YARN_YARN_PATH

try {
  const { stdout } = await execute(process.execPath, [runtimePath, '--version'], {
    cwd: fixtureCwd,
    encoding: 'utf8',
    env: environment,
  })

  assert.equal(stdout.trim(), yarnPlatformVersion)

  await copyFile(runtimePath, checkedRuntimePath)

  assert.deepEqual(await readFile(checkedRuntimePath), await readFile(runtimePath))

  await execute(checkedRuntimePath, ['raijin:generate'], {
    cwd: repoRoot,
    env: environment,
  })
} finally {
  await rm(fixtureCwd, { recursive: true, force: true })
}
