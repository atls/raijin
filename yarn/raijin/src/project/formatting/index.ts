import type { FormatSourcesResult } from '../../application/project/formatting/result.interfaces.js'
import type { CommandInput }        from '../../commands/index.js'

import { formatSources }            from '../../application/project/formatting/format.js'
import { createSourceFiles } from '../../infrastructure/providers/node/project/formatting/files.js'
import { createSourceFormatter }    from '../../infrastructure/providers/prettier/project/format.js'

export type { FormattedSource }     from '../../application/project/formatting/result.interfaces.js'
export type { FormatSourcesResult } from '../../application/project/formatting/result.interfaces.js'

export interface FormatProjectSourcesOptions {
  readonly cwd: string
  readonly targets?: CommandInput
  readonly workspacePackageNames?: ReadonlyArray<string>
}

export const formatProjectSources = async ({
  cwd,
  targets,
  workspacePackageNames,
}: FormatProjectSourcesOptions): Promise<FormatSourcesResult> =>
  formatSources(
    { targets },
    {
      files: createSourceFiles(cwd),
      formatter: createSourceFormatter(workspacePackageNames),
    }
  )
