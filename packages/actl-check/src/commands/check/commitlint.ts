import execa                                   from 'execa'
import { Command }                             from '@oclif/command'

import { COMMITLINT_CONFIG_PATH }              from '@atlantis-lab/config'

import { Conclusion }                          from '../../types'
import { createCheck, getPullCommitsMessages } from '../../github'

const formatResultError = error => `✖   ${error.message} [${error.name}]`

const formatResultStatus = (errors, warnings) =>
  `${errors.length === 0 && warnings.length === 0 ? '✔' : '✖'}   found ${errors.length} problems, ${
    warnings.length
  } warnings`

const formatResult = ({ input, errors = [], warnings = [] }) => `
⧗   input: ${input}
${[
  ...errors.map(formatResultError),
  ...warnings.map(formatResultError),
  formatResultStatus(errors, warnings),
].join('\n')}
`

export default class CommitLintCommand extends Command {
  static description: string = 'Check commit message'

  static examples: string[] = ['$ actl check:commitlint']

  async run(): Promise<void> {
    try {
      const messages = await getPullCommitsMessages()
      const { stdout } = await execa(
        'commitlint',
        [`--config=${COMMITLINT_CONFIG_PATH}`, '-o', 'commitlint-format-json'],
        { input: messages.join('\n') }
      )
      await this.check(JSON.parse(stdout))
    } catch (error) {
      await this.check(JSON.parse(error.stdout))
    }
  }

  async check({ valid, results }: any): Promise<void> {
    await createCheck('CommitLint', valid ? Conclusion.Success : Conclusion.Failure, {
      title: valid ? 'Successful' : `Errors ${results.length}`,
      summary: results.map(formatResult).join('\n'),
      annotations: [],
    })
  }
}
