import assert            from 'node:assert/strict'
import { execFile }      from 'node:child_process'
import { copyFile }      from 'node:fs/promises'
import { mkdir }         from 'node:fs/promises'
import { mkdtemp }       from 'node:fs/promises'
import { rm }            from 'node:fs/promises'
import { writeFile }     from 'node:fs/promises'
import { tmpdir }        from 'node:os'
import { join }          from 'node:path'
import { test }          from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify }     from 'node:util'

const execute = promisify(execFile)
const repoRoot = fileURLToPath(new URL('../../../../../../', import.meta.url))

test('checked runtime rejects an ineligible image without invoking publication tools', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-image-rejection-'))
  const runtime = join(cwd, '.yarn/releases/yarn.js')

  t.after(async () => rm(cwd, { recursive: true, force: true }))
  await mkdir(join(cwd, '.yarn/releases'), { recursive: true })
  await copyFile(join(repoRoot, '.yarn/releases/yarn.js'), runtime)
  await writeFile(
    join(cwd, 'package.json'),
    JSON.stringify({ name: '@fixture/no-image', private: true, type: 'module' })
  )
  await writeFile(join(cwd, 'yarn.lock'), '')
  await writeFile(join(cwd, '.yarnrc.yml'), 'yarnPath: .yarn/releases/yarn.js\n')

  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    CI: 'true',
    HUSKY: '0',
    PATH: cwd,
    YARN_ENABLE_NETWORK: 'false',
  }

  delete environment.NODE_OPTIONS
  delete environment.NODE_PATH

  await assert.rejects(
    execute(process.execPath, [runtime, 'image', 'pack', '--publish', '--json'], {
      cwd,
      env: environment,
      encoding: 'utf8',
      timeout: 10_000,
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error && 'code' in error)
      assert.equal(error.code, 1)
      assert.ok('stdout' in error && typeof error.stdout === 'string')
      const messages = error.stdout
        .trim()
        .split('\n')
        .map((line) => {
          const entry: unknown = JSON.parse(line)

          assert.ok(entry && typeof entry === 'object' && 'type' in entry && entry.type === 'error')
          assert.ok('data' in entry && typeof entry.data === 'string')

          return entry.data
        })

      assert.deepEqual(
        messages.filter((message) => !message.startsWith('Failed with errors')),
        [
          'Workspace @fixture/no-image requires a name and a production start script for image packaging.',
        ]
      )

      return true
    }
  )
})
