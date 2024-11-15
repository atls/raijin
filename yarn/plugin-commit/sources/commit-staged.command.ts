import { BaseCommand } from '@yarnpkg/cli'
import { Option }      from 'clipanion'
import lintStaged      from 'lint-staged'

const config = {
  '*.{yml,yaml,json,graphql,md}': 'yarn format',
  '*.{js,mjs,cjs,jsx,ts,tsx}': ['yarn format', 'yarn lint'],
  '*.{ts,tsx}': ['yarn typecheck'],
  '*.{tsx,ts}': ['yarn test unit'],
}

export class CommitStagedCommand extends BaseCommand {
  static paths = [['commit', 'staged']]

  args: Array<string> = Option.Rest({ required: 0 })

  async execute(): Promise<number> {
    try {
      // @ts-expect-error: Fix import
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
