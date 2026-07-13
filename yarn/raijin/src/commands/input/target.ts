import type { CommandInput }        from './target.interfaces.js'
import type { CommandInputOptions } from './target.interfaces.js'
import type { CommandTarget }       from './target.interfaces.js'

import { npath }                    from '@yarnpkg/fslib'
import { ppath }                    from '@yarnpkg/fslib'

const createTarget = (cwd: CommandInputOptions['cwd'], request: string): CommandTarget => ({
  path: ppath.resolve(cwd, npath.toPortablePath(request)),
  request,
})

export const createCommandInput = ({
  cwd,
  source,
  targets = [],
}: CommandInputOptions): CommandInput => ({
  cwd,
  source,
  targets: Array.from(
    new Map(
      targets.map((request) => {
        const target = createTarget(cwd, request)

        return [target.path, target]
      })
    ).values()
  ),
})
