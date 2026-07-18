import type { CommandContext }      from '@yarnpkg/core'
import type { PortablePath }        from '@yarnpkg/fslib'
import type { CommandClass }        from 'clipanion'

import type { Calls }               from './command.interfaces.js'
import type { Fixture }             from './command.interfaces.js'
import type { RecordingHandler }    from './command.interfaces.js'

import assert                       from 'node:assert/strict'
import { mkdir }                    from 'node:fs/promises'
import { mkdtemp }                  from 'node:fs/promises'
import { readFile }                 from 'node:fs/promises'
import { rm }                       from 'node:fs/promises'
import { writeFile }                from 'node:fs/promises'
import { tmpdir }                   from 'node:os'
import { join }                     from 'node:path'
import { test }                     from 'node:test'

import { BaseCommand }              from '@yarnpkg/cli'
import { getPluginConfiguration }   from '@yarnpkg/cli'
import { npath }                    from '@yarnpkg/fslib'
import { Cli }                      from 'clipanion'
import { Option }                   from 'clipanion'

import { toCommandArguments }       from '@atls/raijin/commands/input'

import { INVOCATION_CWD_ENV }       from '../../../invocation/resolve.js'
import { PROXY_ENV }                from '../../../invocation/resolve.js'
import { GenerateIconsCommand }     from '../command.js'
import { createGeneratedIconInput } from '../command.js'

const restoreEnvironment = (name: string, value: string | undefined): void => {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, name)
  } else {
    process.env[name] = value
  }
}

const interpolate = (value: string): string => `${String.fromCodePoint(36)}{${value}}`

const createRecordingCommand = (
  path: string,
  execute: RecordingHandler
): CommandClass<CommandContext> =>
  class RecordingCommand extends BaseCommand {
    static override paths = [[path]]

    fix: boolean = Option.Boolean('--fix', false)

    files: Array<string> = Option.Rest({ required: 0 })

    override async execute(): Promise<number> {
      return execute(this.files, this.fix)
    }
  }

const createCli = (calls: Calls, formatExitCode = 0): Cli<CommandContext> => {
  const cli = new Cli<CommandContext>({ binaryName: 'yarn', enableCapture: false })

  cli.register(GenerateIconsCommand)
  cli.register(
    createRecordingCommand('format', (files) => {
      calls.format.push(files)

      return formatExitCode
    })
  )
  cli.register(
    createRecordingCommand('lint', (files, fix) => {
      calls.lint.push({ files, fix })

      return 0
    })
  )

  return cli
}

const writeFixture = async (): Promise<Fixture> => {
  const projectCwd = await mkdtemp(join(tmpdir(), 'raijin-icons-command-'))
  const workspaceCwd = join(projectCwd, 'packages/ui')

  await mkdir(join(workspaceCwd, 'icons'), { recursive: true })
  await mkdir(join(workspaceCwd, 'src'), { recursive: true })
  await writeFile(
    join(projectCwd, 'package.json'),
    `${JSON.stringify({ private: true, workspaces: ['packages/*'] }, null, 2)}\n`
  )
  await writeFile(join(projectCwd, 'yarn.lock'), '')
  await writeFile(
    join(workspaceCwd, 'package.json'),
    `${JSON.stringify({ name: '@fixture/ui', private: true }, null, 2)}\n`
  )
  await writeFile(
    join(workspaceCwd, 'icons/check.svg'),
    '<svg viewBox="0 0 16 16"><path fill="#000" d="M1 8l4 4 10-10"/></svg>\n'
  )
  await writeFile(join(workspaceCwd, 'src/manual.tsx'), 'export const Manual = () => null\n')
  await writeFile(
    join(workspaceCwd, 'replacements.ts'),
    "export default { CheckIcon: { '#000': 'currentColor' } }\n"
  )
  await writeFile(
    join(workspaceCwd, 'template.ts'),
    [
      'export default (variables, { tpl }) => tpl`',
      `${interpolate('variables.imports')};`,
      `${interpolate('variables.interfaces')};`,
      `const ${interpolate('variables.componentName')} = (${interpolate('variables.props')}) => ${interpolate('variables.jsx')};`,
      `${interpolate('variables.exports')};`,
      '`',
      '',
    ].join('\n')
  )

  return { projectCwd, workspaceCwd }
}

const runGenerateIcons = async (
  cli: Cli<CommandContext>,
  workspaceCwd: string,
  args: Array<string> = []
): Promise<number> => {
  const previousInvocationCwd = process.env[INVOCATION_CWD_ENV]
  const previousProxy = process.env[PROXY_ENV]

  process.env[INVOCATION_CWD_ENV] = workspaceCwd
  process.env[PROXY_ENV] = 'true'

  try {
    return await cli.run(['ui', 'icons', 'generate', ...args], {
      cwd: npath.toPortablePath(workspaceCwd),
      plugins: getPluginConfiguration(),
      quiet: false,
    })
  } finally {
    restoreEnvironment(INVOCATION_CWD_ENV, previousInvocationCwd)
    restoreEnvironment(PROXY_ENV, previousProxy)
  }
}

test('should represent generated icon targets from workspace cwd', () => {
  const projectCwd = '/tmp/raijin-project' as PortablePath
  const workspaceCwd = '/tmp/raijin-project/packages/ui' as PortablePath
  const input = createGeneratedIconInput(workspaceCwd, ['check.icon.tsx', 'index.ts'])

  assert.equal(input.source, 'generated')
  assert.deepEqual(toCommandArguments(input, projectCwd), [
    'packages/ui/src/check.icon.tsx',
    'packages/ui/src/index.ts',
  ])
})

test('should execute native icon generation and post-process every generated file', async () => {
  const { projectCwd, workspaceCwd } = await writeFixture()
  const calls: Calls = { format: [], lint: [] }

  try {
    assert.equal(await runGenerateIcons(createCli(calls), workspaceCwd, ['--native']), 0)
    assert.match(
      await readFile(join(workspaceCwd, 'src/check.icon.tsx'), 'utf8'),
      /react-native-svg/
    )
    assert.match(await readFile(join(workspaceCwd, 'src/check.icon.tsx'), 'utf8'), /currentColor/)
    assert.deepEqual(calls.format, [['packages/ui/src/check.icon.tsx', 'packages/ui/src/index.ts']])
    assert.deepEqual(calls.lint, [
      {
        files: ['packages/ui/src/check.icon.tsx', 'packages/ui/src/index.ts'],
        fix: true,
      },
    ])
  } finally {
    await rm(projectCwd, { recursive: true, force: true })
  }
})

test('should return the formatter failure without running lint', async () => {
  const { projectCwd, workspaceCwd } = await writeFixture()
  const calls: Calls = { format: [], lint: [] }

  try {
    assert.equal(await runGenerateIcons(createCli(calls, 7), workspaceCwd), 7)
    assert.equal(calls.format.length, 1)
    assert.deepEqual(calls.lint, [])
  } finally {
    await rm(projectCwd, { recursive: true, force: true })
  }
})
