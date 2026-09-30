import type { CommandContext }       from '@yarnpkg/core'
import type { PluginConfiguration }  from '@yarnpkg/core'

import assert                        from 'node:assert/strict'
import { mkdir }                     from 'node:fs/promises'
import { mkdtemp }                   from 'node:fs/promises'
import { readFile }                  from 'node:fs/promises'
import { rm }                        from 'node:fs/promises'
import { writeFile }                 from 'node:fs/promises'
import { tmpdir }                    from 'node:os'
import { join }                      from 'node:path'
import { PassThrough }               from 'node:stream'
import { test }                      from 'node:test'

import { getPluginConfiguration }    from '@yarnpkg/cli'
import { Cli }                       from 'clipanion'

import { composeCommandInvocations } from '@atls/raijin/commands'
import { toPortableCwd }             from '@atls/raijin/commands'

import { plugin }                    from '../../plugin.js'

const capture = (stream: PassThrough): (() => string) => {
  let output = ''

  stream.setEncoding('utf8')
  stream.on('data', (chunk: string) => {
    output += chunk
  })

  return () => output
}

const createCli = (): { cli: Cli<CommandContext>; plugins: PluginConfiguration } => {
  const plugins = getPluginConfiguration()

  plugins.modules.set('@atls/yarn-plugin-library', plugin)
  plugins.plugins.add('@atls/yarn-plugin-library')
  composeCommandInvocations(plugins)

  const cli = new Cli<CommandContext>({
    binaryLabel: 'Yarn',
    binaryName: 'yarn',
    binaryVersion: '0.0.0',
  })
  const [CommandClass] = plugin.commands ?? []

  assert.ok(CommandClass)
  cli.register(CommandClass)

  return { cli, plugins }
}

const createContext = (
  plugins: PluginConfiguration,
  cwd: string,
  stderr: PassThrough,
  stdout: PassThrough
): CommandContext =>
  ({
    colorDepth: 8,
    cwd: toPortableCwd(cwd),
    env: { ...process.env, INIT_CWD: cwd },
    plugins,
    quiet: false,
    stderr,
    stdin: new PassThrough(),
    stdout,
  }) as CommandContext

const createProject = async (source: string): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-library-command-'))

  await mkdir(join(cwd, 'src'))
  await writeFile(join(cwd, 'package.json'), '{"name":"fixture","type":"module"}\n')
  await writeFile(
    join(cwd, 'tsconfig.json'),
    '{"compilerOptions":{"module":"NodeNext","moduleResolution":"NodeNext","rootDir":"src","target":"es2022"},"include":["src/**/*"]}\n'
  )
  await writeFile(join(cwd, 'src/index.ts'), source)

  return cwd
}

const runBuild = async (
  cwd: string,
  interactive = false
): Promise<{ exitCode: number; stderr: string; stdout: string }> => {
  const { cli, plugins } = createCli()
  const stderr = new PassThrough()
  const stdout = new PassThrough()
  const readStderr = capture(stderr)
  const readStdout = capture(stdout)

  if (interactive) {
    Reflect.set(stdout, 'columns', 80)
    Reflect.set(stdout, 'isTTY', true)
  }

  const exitCode = await cli.run(['library', 'build'], createContext(plugins, cwd, stderr, stdout))

  return { exitCode, stderr: readStderr(), stdout: readStdout() }
}

test('builds quietly and reports an interactive compilation failure', async (t) => {
  const cwd = await createProject('export const value = true\n')

  t.after(async () => rm(cwd, { force: true, recursive: true }))

  const completed = await runBuild(cwd)

  assert.deepEqual(completed, { exitCode: 0, stderr: '', stdout: '' })
  assert.match(await readFile(join(cwd, 'dist/index.js'), 'utf8'), /value = true/u)
  await readFile(join(cwd, 'dist/index.d.ts'), 'utf8')

  await writeFile(join(cwd, 'src/index.ts'), 'export const value: string = 1\n')

  const failed = await runBuild(cwd, true)
  const progress = failed.stdout.indexOf('Building library')
  const diagnostic = failed.stdout.indexOf('TS2322')

  assert.equal(failed.exitCode, 1)
  assert.ok(progress >= 0)
  assert.ok(diagnostic > progress)
  assert.match(failed.stdout, /not assignable to type/u)
  assert.doesNotMatch(failed.stdout, /\d+%/u)
  assert.equal(failed.stderr, '')
})
