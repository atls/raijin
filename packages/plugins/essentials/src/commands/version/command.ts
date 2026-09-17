import type { EntryCommandContext } from '@atls/raijin/commands'
import type { PortablePath }        from '@yarnpkg/fslib'

import { BaseCommand }              from '@yarnpkg/cli'
import { npath }                    from '@yarnpkg/fslib'
import { ppath }                    from '@yarnpkg/fslib'
import { xfs }                      from '@yarnpkg/fslib'
import { Command }                  from 'clipanion'

import { runRaijinInitializer }     from '@atls/raijin'

const findPackageCwd = async (cwd: PortablePath): Promise<PortablePath> => {
  if (await xfs.existsPromise(ppath.join(cwd, 'package.json'))) {
    return cwd
  }

  const parent = ppath.dirname(cwd)

  if (parent === cwd) {
    throw new Error('Package manifest was not found for Raijin update')
  }

  return findPackageCwd(parent)
}

export class SetVersionCommand extends BaseCommand {
  static override paths = [['set', 'version', 'atls']]

  static override usage = Command.Usage({
    description: 'install the verified Raijin package and checked runtime pair',
  })

  declare context: EntryCommandContext

  override async execute(): Promise<number> {
    const cwd = await findPackageCwd(this.context.invocation.invocationCwd)

    await runRaijinInitializer({ argv: ['update'], cwd: npath.fromPortablePath(cwd) })

    return 0
  }
}
