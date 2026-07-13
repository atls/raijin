import type { GetPrettierPluginReturn }  from '../interfaces/index.js'
import type { GetPrettierPluginOptions } from '../interfaces/index.js'

import { npath }                         from '@yarnpkg/fslib'

import { resolveWorkspacePackageNames }  from '@atls/raijin/project'

import { createParsers }                 from '../parsers.js'
import { getPrinters }                   from './printers.getter.js'

export const getPrettierPlugin = async (
  options: GetPrettierPluginOptions = {}
): GetPrettierPluginReturn => {
  const printers = await getPrinters()
  const workspacePackageNames =
    options.workspacePackageNames ??
    (await resolveWorkspacePackageNames(npath.toPortablePath(process.cwd())))

  const plugin = {
    printers,
    parsers: createParsers(workspacePackageNames),
  }

  return plugin
}
