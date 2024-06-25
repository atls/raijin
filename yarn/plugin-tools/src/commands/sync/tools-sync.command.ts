import { BaseCommand } from '@yarnpkg/cli'

const commands: Array<Array<string>> = [
  ['tools', 'sync', 'runtime'],
  ['tools', 'sync', 'typescript'],
  ['tools', 'sync', 'tsconfig'],
  ['install'],
]

export class ToolsSyncCommand extends BaseCommand {
  static paths = [['tools', 'sync']]

  async execute(): Promise<number> {
    for (const command of commands) {
      // eslint-disable-next-line no-await-in-loop
      const exitCode = await this.cli.run(command)

      if (exitCode !== 0) {
        return exitCode
      }
    }

    return 0
  }
}
