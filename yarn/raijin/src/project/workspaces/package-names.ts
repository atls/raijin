import type { Project } from '@yarnpkg/core'

import { structUtils }  from '@yarnpkg/core'

export const getWorkspacePackageNames = (project: Project): Array<string> =>
  project.workspaces
    .flatMap((workspace) =>
      workspace.manifest.name ? [structUtils.stringifyIdent(workspace.manifest.name)] : [])
    .filter((name) => name.startsWith('@'))
    .sort()
