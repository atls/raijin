import type { CreatePluginOptions }     from './create.interfaces.js'
import type { CreatePluginResult }      from './create.interfaces.js'

import { npath }                        from '@yarnpkg/fslib'

import { resolveWorkspacePackageNames } from '@atls/raijin/project'

import { createParsers }                from './parsers.js'
import { printers }                     from './printers/index.js'

export const createPlugin = async (options: CreatePluginOptions = {}): CreatePluginResult => {
  const workspacePackageNames =
    options.workspacePackageNames ??
    (await resolveWorkspacePackageNames(npath.toPortablePath(process.cwd())))

  return {
    printers,
    parsers: createParsers(workspacePackageNames),
  }
}

export { createPlugin as getPrettierPlugin }
