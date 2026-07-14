import type { Project as YarnProject } from '@yarnpkg/core'
import type { PortablePath }           from '@yarnpkg/fslib'

import { Configuration }               from '@yarnpkg/core'
import { Project }                     from '@yarnpkg/core'
import { structUtils }                 from '@yarnpkg/core'

export const getWorkspacePackageNames = (project: YarnProject): Array<string> =>
  project.workspaces
    .flatMap((workspace) =>
      workspace.manifest.name ? [structUtils.stringifyIdent(workspace.manifest.name)] : [])
    .filter((name) => name.startsWith('@'))
    .sort()

export const resolveWorkspacePackageNames = async (cwd: PortablePath): Promise<Array<string>> => {
  const projectCwd = await Configuration.findProjectCwd(cwd)

  if (!projectCwd) {
    return []
  }

  // Standalone Prettier config has no Yarn CLI plugin registry.
  const configuration = await Configuration.find(cwd, null, { strict: false })
  const { project } = await Project.find(configuration, cwd)

  return getWorkspacePackageNames(project)
}
