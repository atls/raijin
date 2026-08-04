import type { ProjectInvocation }    from '@atls/raijin/commands'

import { BaseCommand }               from '@yarnpkg/cli'

import { defineCommandInvocation }   from '@atls/raijin/commands'

import { AbstractRaijinSyncCommand } from './base.js'

const commands: Array<Array<string>> = [
  ['raijin', 'sync', 'typescript'],
  ['raijin', 'sync', 'tsconfig'],
  ['install'],
]

export class RaijinSyncCommand extends AbstractRaijinSyncCommand {
  static override paths = [['raijin', 'sync']]

  static raijinCommand = defineCommandInvocation({ scope: 'project' })

  static override usage = BaseCommand.Usage({
    description: 'synchronize Raijin project support files',
  })

  override async execute(invocation?: ProjectInvocation): Promise<number> {
    if (!invocation) {
      throw new Error('Command invocation context is missing')
    }

    for (const command of commands) {
      // eslint-disable-next-line no-await-in-loop
      const exitCode = await invocation.yarn.execute(command, {
        stdin: this.context.stdin,
        stdout: this.context.stdout,
        stderr: this.context.stderr,
      })

      if (exitCode !== 0) {
        return exitCode
      }
    }

    return 0
  }
}
