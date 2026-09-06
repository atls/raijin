import type { TestContext } from 'node:test'

import { execFile }         from 'node:child_process'
import { copyFile }         from 'node:fs/promises'
import { mkdir }            from 'node:fs/promises'
import { mkdtemp }          from 'node:fs/promises'
import { realpath }         from 'node:fs/promises'
import { rm }               from 'node:fs/promises'
import { writeFile }        from 'node:fs/promises'
import { tmpdir }           from 'node:os'
import { join }             from 'node:path'
import { fileURLToPath }    from 'node:url'
import { promisify }        from 'node:util'

export const execute = promisify(execFile)

const driver = fileURLToPath(new URL('./run.fixture.ts', import.meta.url))
const checker = new URL('./check.fixture.mjs', import.meta.url)
const localGitEnvironmentNames = (await execute('git', ['rev-parse', '--local-env-vars'])).stdout
  .trim()
  .split('\n')

const createGitEnvironment = (environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv => {
  const nextEnvironment = { ...environment }

  for (const name of localGitEnvironmentNames) {
    Reflect.deleteProperty(nextEnvironment, name)
  }

  return nextEnvironment
}

const gitEnvironment = createGitEnvironment(process.env)

export const git = async (cwd: string, ...args: Array<string>): Promise<string> =>
  (await execute('git', args, { cwd, env: gitEnvironment })).stdout

export const createRepository = async (t: TestContext): Promise<string> => {
  const cwd = await realpath(await mkdtemp(join(tmpdir(), 'raijin staged ')))

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  await mkdir(join(cwd, 'client'))
  await git(cwd, 'init', '--quiet')
  await git(cwd, 'config', 'user.name', 'Fixture')
  await git(cwd, 'config', 'user.email', 'fixture@example.invalid')
  await git(cwd, 'config', 'commit.gpgsign', 'false')
  await git(cwd, 'config', 'core.hooksPath', '.git/hooks')
  await writeFile(join(cwd, '.gitignore'), '.checks.jsonl\n')

  await Promise.all(
    [
      ['', 'backend'],
      ['client', 'client'],
    ].map(async ([directory, owner]) => {
      await writeFile(join(cwd, directory, 'package.json'), JSON.stringify({ name: owner }))
      await writeFile(
        join(cwd, directory, '.lintstagedrc.json'),
        JSON.stringify({ '*.txt': `node check.mjs ${owner}` })
      )
      await copyFile(checker, join(cwd, directory, 'check.mjs'))
      await writeFile(join(cwd, directory, 'file with spaces.txt'), 'initial\n')
    })
  )

  await writeFile(join(cwd, 'unrelated.txt'), 'initial unrelated\n')
  await git(cwd, 'add', '.')
  await git(cwd, 'commit', '--quiet', '-m', 'fixture')

  return cwd
}

export const run = async (
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
  entry: URL | string = driver,
  args: Array<string> = []
): Promise<{ code: number; output: string }> => {
  try {
    const { stdout, stderr } = await execute(
      process.execPath,
      [...process.execArgv, entry instanceof URL ? fileURLToPath(entry) : entry, ...args],
      {
        cwd,
        env: {
          ...createGitEnvironment(env),
          FORCE_COLOR: '0',
          NODE_ENV: 'development',
          TERM: 'dumb',
        },
        maxBuffer: 4 * 1024 * 1024,
      }
    )

    return { code: 0, output: stdout + stderr }
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || typeof error.code !== 'number') {
      throw error
    }

    return {
      code: error.code,
      output: `${'stdout' in error ? String(error.stdout) : ''}${'stderr' in error ? String(error.stderr) : ''}`,
    }
  }
}
