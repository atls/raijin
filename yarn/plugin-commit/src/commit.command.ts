import { BaseCommand } from '@yarnpkg/cli'
import { Command }     from 'clipanion'

class CommitCommand extends BaseCommand {
  @Command.Rest({ required: 0 })
  args: Array<string> = []

  @Command.Path(`commit`)
  async execute() {
    await this.cli.run(['actl', 'commit', ...this.args])
  }
}

export { CommitCommand }
