import { AbstractRaijinSyncCommand } from './base.js'

const commands: Array<Array<string>> = [
  ['raijin', 'sync', 'typescript'],
  ['raijin', 'sync', 'tsconfig'],
  ['install'],
]

export class RaijinSyncCommand extends AbstractRaijinSyncCommand {
  static override paths = [['raijin', 'sync']]

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
