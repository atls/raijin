import { BaseCommand }              from '@yarnpkg/cli'

import { CommitLinter }             from '@atls/code-commit'
import { read }                     from '@atls/code-commit'
import { resolveProjectInvocation } from '@atls/raijin/commands'

class CommitMessageLintCommand extends BaseCommand {
  static override paths = [['commit', 'message', 'lint']]

  static override usage = BaseCommand.Usage({
    description: 'validate commit messages against project scopes',
  })

  async execute(): Promise<number> {
    const {
      project: { workspaces },
    } = await resolveProjectInvocation(this.context.cwd, this.context.plugins)

    const workspaceNames = new Set(workspaces.map(({ manifest }) => manifest.name?.name ?? ''))
    const scopes = new Set(workspaces.map(({ manifest }) => manifest.name?.scope ?? ''))

    const linter = new CommitLinter({
      scopes: Array.from(scopes),
      workspaceNames: Array.from(workspaceNames),
    })

    const messages = await read({ edit: true })
    const results = await Promise.all(messages.map(async (message) => linter.lint(message)))

    const output = linter.format({ results })

    if (output !== '') {
      this.context.stdout.write(output)
    }

    return results.some((result) => !result.valid) ? 1 : 0
  }
}

export { CommitMessageLintCommand }
