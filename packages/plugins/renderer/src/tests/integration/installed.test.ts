import assert            from 'node:assert/strict'
import { execFile }      from 'node:child_process'
import { mkdir }         from 'node:fs/promises'
import { mkdtemp }       from 'node:fs/promises'
import { realpath }      from 'node:fs/promises'
import { rm }            from 'node:fs/promises'
import { writeFile }     from 'node:fs/promises'
import { tmpdir }        from 'node:os'
import { join }          from 'node:path'
import test              from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify }     from 'node:util'

const execute = promisify(execFile)
const runtime = fileURLToPath(new URL('../../../../../../.yarn/releases/yarn.js', import.meta.url))

test('renderer commands forward Next arguments from the selected workspace and preserve failures', async (context) => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'renderer-cli-')))
  context.after(async () => rm(root, { recursive: true, force: true }))
  const cwd = join(root, 'app')
  const provider = join(root, 'provider')
  const env: NodeJS.ProcessEnv = { ...process.env, YARN_ENABLE_IMMUTABLE_INSTALLS: 'false' }
  delete env.NODE_OPTIONS
  delete env.INIT_CWD

  await mkdir(cwd)
  await mkdir(provider)
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({ private: true, workspaces: ['app', 'provider'] })
  )
  await writeFile(join(root, '.yarnrc.yml'), 'nodeLinker: pnp\n')
  await writeFile(
    join(cwd, 'package.json'),
    JSON.stringify({ name: 'app', dependencies: { next: 'workspace:*' } })
  )
  await writeFile(
    join(provider, 'package.json'),
    JSON.stringify({ name: 'next', version: '16.3.5', bin: { next: './cli.js' } })
  )
  await writeFile(
    join(provider, 'cli.js'),
    `console.log(JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(2) })); process.exitCode = Number(process.env.NEXT_TEST_EXIT || 0);\n`
  )
  await execute(process.execPath, [runtime, 'install'], { cwd: root, env })

  await Promise.all(
    ['build', 'dev', 'start'].map(async (command) => {
      const help = await execute(process.execPath, [runtime, 'renderer', command, '--help'], {
        cwd: root,
        env,
      })
      assert.match(help.stdout, /renderer/)
      const args = [command, ...(command === 'start' ? [] : ['--webpack']), 'site', '--help']
      const result = await execute(
        process.execPath,
        [runtime, 'renderer', command, 'site', '--help'],
        { cwd, env }
      )
      assert.deepEqual(JSON.parse(result.stdout), { cwd, args })
      await assert.rejects(
        execute(process.execPath, [runtime, 'renderer', command], {
          cwd,
          env: { ...env, NEXT_TEST_EXIT: '7' },
        }),
        { code: 7 }
      )
    })
  )
})
