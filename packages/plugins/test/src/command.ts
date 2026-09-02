import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import type { TestScenario }            from './interfaces/input.js'

import { BaseCommand }                  from '@yarnpkg/cli'
import { Command }                      from 'clipanion'
import { Option }                       from 'clipanion'
import { isEnum }                       from 'typanion'

import { toNativeCwd }                  from '@atls/raijin/commands'

import { resolveInput }                 from './command/resolve.js'
import { testProject }                  from './project/index.js'

const createTestCommand = (path: Array<string>, scenario: TestScenario, description: string) =>
  class TestCommand extends BaseCommand {
    static override paths = [path]

    static override usage = Command.Usage({
      description,
      details: `
      Run either integration or unit tests with Node.js built-in test runner.

      Integration tests are defined by placing *.test.[j|t]sx? in 'integration' folder anywhere.

      Unit tests are all *.test.[j|t]sx? except in 'integration' folder.
      `,
      examples: [
        ['Run all unit tests', 'yarn test unit'],
        ['Run all integration tests', 'yarn test integration'],
        [`Run all integration tests which file names include 'menu'`, 'yarn test integration menu'],
        [
          `Run all unit tests in watch mode - reloading after any change in file`,
          'yarn test unit -w',
        ],
      ],
    })

    declare context: WorkspaceCommandContext

    target = Option.String('-t,--target')

    watch: boolean = Option.Boolean('-w,--watch', false)

    files: Array<string> = Option.Rest({ required: 0 })

    testReporter = Option.String('--test-reporter', {
      validator: isEnum(['tap']),
    })

    override async execute(): Promise<number> {
      const { executionCwd, invocationCwd, project } = this.context.invocation
      const result = await testProject({
        rootCwd: toNativeCwd(project.cwd),
        cwd: toNativeCwd(executionCwd),
        input: resolveInput({
          files: this.files,
          invocationCwd,
          target: this.target,
        }),
        reporter: this.testReporter === 'tap' ? 'tap' : 'spec',
        scenario,
        stdout: this.context.stdout,
        watch: this.watch,
      })

      if (result.status === 'provider-failed') {
        this.context.stderr.write(`${result.failure.name}: ${result.failure.message}\n`)
      }

      return result.terminal.exitCode
    }
  }

export const TestCommand = createTestCommand(['test'], 'general', 'run all workspace tests')

export const TestIntegrationCommand = createTestCommand(
  ['test', 'integration'],
  'integration',
  'run integration tests'
)

export const TestUnitCommand = createTestCommand(['test', 'unit'], 'unit', 'run unit tests')
