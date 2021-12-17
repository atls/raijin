import { BaseCommand } from '@yarnpkg/cli'
import lintStaged      from 'lint-staged'

const config = {
  '*.{yml,yaml,json,graphql,md}': 'yarn format',
  '*.{js,jsx,ts,tsx}': ['yarn format', 'yarn lint'],
  '*.{ts,tsx}': ['yarn typecheck'],
  '*.{tsx,ts}': ['yarn actl test:unit --bail --find-related-tests'],
}

export class CommitStagedCommand extends BaseCommand {
  static paths = [['commit', 'staged']]

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
