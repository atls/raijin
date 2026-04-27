import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { realpath } from 'node:fs/promises'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname } from 'node:path'
import { delimiter } from 'node:path'
import { join } from 'node:path'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const runExecFile = async (file, args, options = {}) =>
  new Promise((resolvePromise) => {
    execFile(
      file,
      args,
      {
        timeout: 60_000,
        maxBuffer: 1024 * 1024 * 16,
        ...options,
      },
      (error, stdout, stderr) => {
        resolvePromise({
          code: error ? error.code : 0,
          error,
          stdout: stdout ?? '',
          stderr: stderr ?? '',
        })
      }
    )
  })

test('should run checks proxy via Corepack shim without Corepack package resolution errors', async (t) => {
  const shimDir = await mkdtemp(join(tmpdir(), 'raijin-corepack-shim-'))
  const yarnShim = join(shimDir, process.platform === 'win32' ? 'yarn.cmd' : 'yarn')

  t.after(async () => {
    await rm(shimDir, { recursive: true, force: true })
  })

  const corepackEnableResult = await runExecFile(
    'corepack',
    ['enable', '--install-directory', shimDir],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        COREPACK_ENABLE_DOWNLOAD_PROMPT: '0',
      },
    }
  )

  if (corepackEnableResult.error?.code === 'ENOENT') {
    t.skip('corepack is not available in environment')

    return
  }

  assert.equal(
    corepackEnableResult.code,
    0,
    corepackEnableResult.stderr || corepackEnableResult.stdout
  )

  const resolvedShimPath = await realpath(yarnShim)

  assert.match(resolvedShimPath, /corepack[\\/]+dist[\\/]+yarn\.js$/)

  const env = {
    ...process.env,
    NODE_OPTIONS: '',
    PATH: `${shimDir}${delimiter}${process.env.PATH ?? ''}`,
    COREPACK_ENABLE_DOWNLOAD_PROMPT: '0',
    COREPACK_ENABLE_PROJECT_SPEC: '0',
  }

  delete env.GITHUB_TOKEN

  const checksRunResult = await runExecFile(yarnShim, ['checks', 'lint', '--changed'], {
    cwd: repoRoot,
    env,
  })

  const combinedOutput = `${checksRunResult.stdout}\n${checksRunResult.stderr}`

  assert.equal(checksRunResult.code, 1, combinedOutput)
  assert.match(combinedOutput, /GITHUB_TOKEN is not defined/)
  assert.match(combinedOutput, /\.yarn[\\/]releases[\\/]yarn\.mjs/)
  assert.doesNotMatch(combinedOutput, /Your application tried to access corepack/)
  assert.doesNotMatch(combinedOutput, /Required package: corepack/)
  assert.doesNotMatch(combinedOutput, /corepack\/package\.json/)
})
