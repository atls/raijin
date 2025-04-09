import { execSync }    from 'node:child_process'

import { BaseCommand } from '@yarnpkg/cli'
import { Option }      from 'clipanion'
import lintStaged      from 'lint-staged'

const config: lintStaged.Config = {
  '*.{yml,yaml,json,graphql,md}': 'yarn format',
  '*.{js,mjs,cjs,jsx,ts,tsx}': ['yarn format', 'yarn lint'],
  '*.{ts,tsx}': 'yarn typecheck',
  '*.{test,spec}.{ts,tsx}': 'yarn test unit',
}

export class CommitStagedCommand extends BaseCommand {
  static override paths = [['commit', 'staged']]

  args: Array<string> = Option.Rest({ required: 0 })

  async execute(): Promise<number> {
    try {
      let safeMaxArgLength = 8190

      try {
        const ARG_MAX = parseInt(execSync('getconf ARG_MAX', { encoding: 'utf-8' }), 10)

        safeMaxArgLength = Math.floor(ARG_MAX * 0.5)
      } catch {}

      // @ts-expect-error: Fix import
      const passed = await lintStaged({
        config,
        maxArgLength: safeMaxArgLength,
      })

      return passed ? 0 : 1
    } catch {
      return 1
    }
  }
}
