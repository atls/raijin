import type { ProjectInvocation } from '@atls/raijin/commands'

import { CommitLinter }           from '@atls/code-commit'
import { RaijinCommand }          from '@atls/raijin/commands'
import { read }                   from '@atls/code-commit'

class CommitMessageLintCommand extends RaijinCommand {
  static override paths = [['commit', 'message', 'lint']]

  static override usage = RaijinCommand.Usage({
    description: 'validate commit messages against project scopes',
  })

  async executeProject(invocation: ProjectInvocation): Promise<number> {
    const {
      project: { workspaces },
    } = invocation

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
