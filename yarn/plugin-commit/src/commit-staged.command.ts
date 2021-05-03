import { BaseCommand } from '@yarnpkg/cli'
import { Command }     from 'clipanion'
import lintStaged      from 'lint-staged'

const config = {
  '*.{yml,yaml,json,graphql,md}': 'yarn actl format',
  '*.{js,jsx,ts,tsx}': ['yarn actl format', 'yarn actl lint'],
  '*.{ts,tsx}': ['yarn actl typecheck'],
  '*.{tsx,ts}': ['yarn actl test:unit --bail --find-related-tests'],
}

export class CommitStagedCommand extends BaseCommand {
  @Command.Path('commit', 'staged')
  async execute() {
    try {
      const passed = await lintStaged({
        config,
        debug: false,
      })

      return passed ? 0 : 1
    } catch {
      return 1
    }
  }
}
