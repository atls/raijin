import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import { BaseCommand }                  from '@yarnpkg/cli'
import { Option }                       from 'clipanion'

export class RendererStartCommand extends BaseCommand {
  static override paths = [['renderer', 'start']]

  static override usage = BaseCommand.Usage({
    description: 'start a built Next.js application',
  })

  args = Option.Proxy()

  declare context: WorkspaceCommandContext

  override async execute(): Promise<number> {
    if (this.args.length === 1 && ['-h', '--help'].includes(this.args[0])) {
      this.context.stdout.write(this.cli.usage(this, { detailed: true }))

      return 0
    }

    const { workspace, yarn } = this.context.invocation

    return yarn.execute(['exec', 'next', 'start', ...this.args], {
      locator: workspace.anchoredLocator,
    })
  }
}
