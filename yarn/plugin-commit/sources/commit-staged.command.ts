import { execSync }    from 'node:child_process'

import { BaseCommand } from '@yarnpkg/cli'
import { Option }      from 'clipanion'
import lintStaged      from 'lint-staged'

const resolveRootDir = (): string => {
  try {
    // eslint-disable-next-line n/no-sync
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim()
  } catch {
    return process.cwd()
  }
}

const quoteShellArgument = (value: string): string => JSON.stringify(value)

export const resolveYarnCommandPath = (): string =>
  process.env.npm_execpath || process.argv[1] || 'yarn'

export const createConfig = (yarnCommandPath = resolveYarnCommandPath()): lintStaged.Config => {
  const yarnCommand = (command: string): string =>
    `${quoteShellArgument(yarnCommandPath)} ${command}`

  return {
    '*.{yml,yaml,json,graphql,md}': yarnCommand('format'),
    '*.{js,mjs,cjs,jsx,ts,tsx}': [yarnCommand('format'), yarnCommand('lint')],
    '*.{ts,tsx}': yarnCommand('typecheck'),
    '*.{test,spec}.{ts,tsx}': yarnCommand('test unit'),
  }
}

export class CommitStagedCommand extends BaseCommand {
  static override paths = [['commit', 'staged']]

  static override usage = BaseCommand.Usage({
    description: 'run project checks for staged files',
  })

  args: Array<string> = Option.Rest({ required: 0 })

  async execute(): Promise<number> {
    try {
      let safeMaxArgLength = 8190

      try {
        // eslint-disable-next-line n/no-sync
        const ARG_MAX = parseInt(execSync('getconf ARG_MAX', { encoding: 'utf-8' }), 10)

        safeMaxArgLength = Math.floor(ARG_MAX * 0.5)
        // eslint-disable-next-line no-empty
      } catch {}

      // @ts-expect-error: Fix import
      const passed = await lintStaged({
        config: createConfig(),
        cwd: resolveRootDir(),
        maxArgLength: safeMaxArgLength,
      })

      return passed ? 0 : 1
    } catch {
      return 1
    }
  }
}
