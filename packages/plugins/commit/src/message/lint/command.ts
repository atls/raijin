import type { ProjectCommandContext } from '@atls/raijin/commands'

import { BaseCommand }                from '@yarnpkg/cli'
import read                           from '@commitlint/read'

import { toNativeCwd }                from '@atls/raijin/commands'

import { createCommitMessagePolicy }  from '../policy.js'

class CommitMessageLintCommand extends BaseCommand {
  static override paths = [['commit', 'message', 'lint']]

  static override usage = BaseCommand.Usage({
    description: 'validate commit messages against project scopes',
  })

  declare context: ProjectCommandContext

  override async execute(): Promise<number> {
    const { project } = this.context.invocation
    const policy = createCommitMessagePolicy(project)
    const messages = await read({ cwd: toNativeCwd(project.cwd), edit: true })
    const results = await Promise.all(messages.map(async (message) => policy.lint(message)))

    const output = policy.format(results)

    if (output !== '') {
      this.context.stdout.write(output)
    }

    return results.some((result) => !result.valid) ? 1 : 0
  }
}

export { CommitMessageLintCommand }
