import type { EntryCommandContext } from '@atls/raijin/commands'

import { BaseCommand }              from '@yarnpkg/cli'
import { npath }                    from '@yarnpkg/fslib'
import { Option }                   from 'clipanion'

import { verifyStagedChanges }      from './verify.js'

export class CommitStagedCommand extends BaseCommand {
  static override paths = [['commit', 'staged']]

  static override usage = BaseCommand.Usage({
    description: 'run project checks for staged files',
  })

  args: Array<string> = Option.Rest({ required: 0 })

  declare context: EntryCommandContext

  override async execute(): Promise<number> {
    const originalCwd = process.cwd()

    try {
      process.chdir(npath.fromPortablePath(this.context.invocation.executionCwd))

      return (await verifyStagedChanges()) ? 0 : 1
    } catch (error) {
      this.context.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)

      return 1
    } finally {
      process.chdir(originalCwd)
    }
  }
}
