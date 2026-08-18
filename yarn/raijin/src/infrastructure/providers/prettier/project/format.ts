import type { SourceFormatter } from '../../../../application/project/formatting/ports/format.interfaces.js'

import { format }                 from 'prettier'

import { resolvePrettierProject } from '../../../../config/prettier/index.js'

export const createSourceFormatter = (
  workspacePackageNames?: ReadonlyArray<string>
): SourceFormatter => ({
  format: async (target, source) => {
    const config = await resolvePrettierProject({
      filepath: target.path,
      plugin: { workspacePackageNames },
    })

    return format(source, { ...config, filepath: target.file })
  },
})
