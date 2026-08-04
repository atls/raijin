import type { ProjectInvocation }  from '@atls/raijin/commands'

import { BaseCommand }             from '@yarnpkg/cli'

import { CommitLinter }            from '@atls/code-commit'
import { read }                    from '@atls/code-commit'
import { defineCommandInvocation } from '@atls/raijin/commands'

class CommitMessageLintCommand extends BaseCommand {
  static override paths = [['commit', 'message', 'lint']]

  static raijinCommand = defineCommandInvocation({ scope: 'project' })

  static override usage = BaseCommand.Usage({
    description: 'validate commit messages against project scopes',
  })

  override async execute(invocation?: ProjectInvocation): Promise<number> {
    if (!invocation) {
      throw new Error('Command invocation context is missing')
    }

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
