import { BaseCommand } from '@yarnpkg/cli'

class CommitMessageLintCommand extends BaseCommand {
  static paths = [['commit', 'message', 'lint']]

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
