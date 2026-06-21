import { AbstractToolsCommand } from './abstract-tools.command.js'

const commands: Array<Array<string>> = [
  ['tools', 'sync', 'typescript'],
  ['tools', 'sync', 'tsconfig'],
  ['install'],
]

export class ToolsSyncCommand extends AbstractToolsCommand {
  static override paths = [['tools', 'sync']]

  override async executeRegular(): Promise<number> {
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
