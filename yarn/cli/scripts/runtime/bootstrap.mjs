import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const runtimePath = fileURLToPath(new URL('../../dist/runtime/yarn.mjs', import.meta.url))
const execute = promisify(execFile)
const cwd = await mkdtemp(join(tmpdir(), 'raijin-yarn-runtime-bootstrap-'))
const env = { ...process.env }

delete env.NODE_OPTIONS
delete env.NODE_PATH

try {
  const { stdout } = await execute(process.execPath, [runtimePath, '--version'], {
    cwd,
    encoding: 'utf8',
    env,
  })

  if (!stdout.trim()) {
    throw new Error('Runtime did not print its version')
  }
} finally {
  await rm(cwd, { recursive: true, force: true })
}
