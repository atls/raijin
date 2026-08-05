import type { ProjectCommandContext } from '@atls/raijin/commands'

import { AbstractRaijinSyncCommand }  from './base.js'

const commands: Array<Array<string>> = [
  ['raijin', 'sync', 'typescript'],
  ['raijin', 'sync', 'tsconfig'],
  ['install'],
]

export class RaijinSyncCommand extends AbstractRaijinSyncCommand {
  static override paths = [['raijin', 'sync']]

  static override usage = AbstractRaijinSyncCommand.Usage({
    description: 'synchronize Raijin project support files',
  })

  declare context: ProjectCommandContext

  override async execute(): Promise<number> {
    const { invocation } = this.context

    for (const command of commands) {
      // eslint-disable-next-line no-await-in-loop
      const exitCode = await invocation.yarn.execute(command)

      if (exitCode !== 0) {
        return exitCode
      }
    }

    return 0
  }
}
