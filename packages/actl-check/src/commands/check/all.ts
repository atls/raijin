import { Command, Option }       from 'clipanion'

import CommitLintCommand from './commitlint'
import LintCommand       from './lint'
import TestCommand       from './test'
import TypecheckCommand  from './typecheck'

export default class AllCommand extends Command {
  // static description: string = 'Run all checks'
  //
  // static examples: string[] = ['$ actl check:all']

  static paths = [['check:all']]

  async execute(): Promise<void> {
    const commands = [CommitLintCommand.paths[0][0], LintCommand.paths[0][0], TestCommand.paths[0][0], TypecheckCommand.paths[0][0]]

    await Promise.all(
      commands.map(async command => {
        try {
          await this.cli.run([command])
        } catch (error) {
          this.context.stdout.write(`${error}`) // eslint-disable-line
        }
      })
    )
  }
}
