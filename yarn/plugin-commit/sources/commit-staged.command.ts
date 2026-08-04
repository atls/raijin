import type { EntryInvocation } from '@atls/raijin/commands'

import { npath }                from '@yarnpkg/fslib'
import { Option }               from 'clipanion'
import lintStaged               from 'lint-staged'

import { RaijinCommand }        from '@atls/raijin/commands'

const resolveRootDir = async (invocation: EntryInvocation): Promise<string> => {
  try {
    const result = await invocation.child.execute('git', ['rev-parse', '--show-toplevel'], {
      output: { mode: 'capture' },
    })

    if (result.exitCode === 0) {
      return result.stdout.trim()
    }
  } catch {
    // Fall back to the invocation directory when Git is unavailable.
  }

  return npath.fromPortablePath(invocation.invocationCwd)
}

const resolveSafeMaxArgLength = async (invocation: EntryInvocation): Promise<number> => {
  try {
    const result = await invocation.child.execute('getconf', ['ARG_MAX'], {
      output: { mode: 'capture' },
    })
    const maxArgLength = Number.parseInt(result.stdout, 10)

    if (result.exitCode === 0 && Number.isFinite(maxArgLength)) {
      return Math.floor(maxArgLength * 0.5)
    }
  } catch {
    // Use the Windows-compatible fallback when getconf is unavailable.
  }

  return 8190
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

export class CommitStagedCommand extends RaijinCommand {
  static override paths = [['commit', 'staged']]

  static override usage = RaijinCommand.Usage({
    description: 'run project checks for staged files',
  })

  args: Array<string> = Option.Rest({ required: 0 })

  async executeEntry(invocation: EntryInvocation): Promise<number> {
    try {
      // @ts-expect-error: Fix import
      const passed = await lintStaged({
        config: createConfig(),
        cwd: await resolveRootDir(invocation),
        maxArgLength: await resolveSafeMaxArgLength(invocation),
      })

      return passed ? 0 : 1
    } catch {
      return 1
    }
  }
}
