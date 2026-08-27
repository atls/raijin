import type { WorkspaceInvocation }     from '@atls/raijin/commands'
import type { WorkspaceCommandContext } from '@atls/raijin/commands'
import type { PortablePath }            from '@yarnpkg/fslib'

import type { TestScenario }            from './execution/index.js'

import { BaseCommand }                  from '@yarnpkg/cli'
import { Command }                      from 'clipanion'
import { Option }                       from 'clipanion'
import { isEnum }                       from 'typanion'

import { createTestCommandInput }       from './command-input.js'
import { createProjectTestOutcome }     from './execution/index.js'
import { executeProjectTests }          from './execution/index.js'

export abstract class AbstractTestCommand extends BaseCommand {
  static override usage = Command.Usage({
    description: 'Run tests',
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

  async executeScenario(scenario: TestScenario, invocation: WorkspaceInvocation): Promise<number> {
    const result = await executeProjectTests({
      input: this.createInput(invocation.invocationCwd),
      invocation,
      reporter: this.testReporter === 'tap' ? 'tap' : 'spec',
      scenario,
      watch: this.watch,
    })
    const outcome = createProjectTestOutcome(result)

    if (result.reason === 'provider-failed' && outcome.exitCode !== 0) {
      console.error(outcome.summary) // eslint-disable-line no-console
    }

    return outcome.exitCode
  }

  protected createInput(invocationCwd: PortablePath) {
    return createTestCommandInput({
      files: this.files,
      invocationCwd,
      target: this.target,
    })
  }
}
