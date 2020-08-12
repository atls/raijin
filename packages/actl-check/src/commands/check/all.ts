import { Command } from '@oclif/command';
import CommitLintCommand from './commitlint'
import LintCommand from './lint'
import TestCommand from './test'
import TypecheckCommand from './typecheck'

export default class AllCommand extends Command {
  static description: string = 'Run all checks'
  static examples: string[] = ['$ actl check:all']

  async run(): Promise<void> {
    const commands = [CommitLintCommand, LintCommand, TestCommand, TypecheckCommand]

    await Promise.all(commands.map(async (command) => {
      try {
        await command.run([]);
      }
      catch (error) {
        console.log(error); // eslint-disable-line
      }
    }));
  }
}
