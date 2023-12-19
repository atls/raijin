import { BaseCommand } from '@yarnpkg/cli'

import { Option }      from 'clipanion'

class CommitCommand extends BaseCommand {
  static paths = [['commit']]

  args: Array<string> = Option.Rest({ required: 0 })

  async execute() {
    await this.cli.run(['actl', 'commit', ...this.args])
  }
}

export { CommitCommand }
