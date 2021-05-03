import { BaseCommand } from '@yarnpkg/cli'
import { Command }     from 'clipanion'

import { format }      from '@atls/code-commitlint'
import { lint }        from '@atls/code-commitlint'
import { read }        from '@atls/code-commitlint'

class CommitMessageLintCommand extends BaseCommand {
  @Command.Path('commit', 'message', 'lint')
  async execute() {
    const messages = await read({ edit: true })
    const results = await Promise.all(messages.map(lint))

    const output = format({ results })

    if (output !== '') {
      this.context.stdout.write(output)
    }

    return results.some((result) => result.valid === false) ? 1 : 0
  }
}

export { CommitMessageLintCommand }
