import type { Project } from '@yarnpkg/core'

import { structUtils }  from '@yarnpkg/core'

export const getWorkspacePackageNames = (project: Pick<Project, 'workspaces'>): Array<string> =>
  project.workspaces.flatMap((workspace) =>
    workspace.manifest.name ? [structUtils.stringifyIdent(workspace.manifest.name)] : [])
