import { BaseCommand }                from '@yarnpkg/cli'
import { Command }                    from 'clipanion'

import { executeProjectCommandProxy } from '@atls/raijin/commands'
import { shouldExecuteCommandProxy }  from '@atls/raijin/commands'

export abstract class AbstractRaijinSyncCommand extends BaseCommand {
  static override usage = Command.Usage({
    description: 'Update Raijin project support files',
    details: `
    Update Raijin project support files such as \`tsconfig\` and \`typescript\` version
    `,
    examples: [
      ['Update tsconfig', 'yarn raijin sync tsconfig'],
      ['Update runtime', 'yarn install'],
      ['Update typescript version', 'yarn raijin sync typescript'],
      [`Update all`, 'yarn raijin sync'],
    ],
  })

  override async execute(): Promise<number> {
    if (shouldExecuteCommandProxy()) {
      return this.executeProxy()
    }

    return this.executeRegular()
  }

  async executeProxy(command: Array<string> = ['raijin', 'sync']): Promise<number> {
    return executeProjectCommandProxy({
      args: command,
      cwd: this.context.cwd,
      plugins: this.context.plugins,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }

  async executeRegular(): Promise<number> {
    return 0
  }
}
