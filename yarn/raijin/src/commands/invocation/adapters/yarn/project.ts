import type { Configuration as YarnConfiguration } from '@yarnpkg/core'
import type { Project as YarnProject }             from '@yarnpkg/core'
import type { Workspace }                          from '@yarnpkg/core'
import type { PortablePath }                       from '@yarnpkg/fslib'

import { Configuration }                           from '@yarnpkg/core'
import { Project }                                 from '@yarnpkg/core'

export type PluginConfiguration = Parameters<typeof Configuration.find>[1]

export interface ProjectResolution {
  configuration: YarnConfiguration
  project: YarnProject
  workspace: Workspace | null
}

export const resolveProject = async (
  cwd: PortablePath,
  plugins: PluginConfiguration
): Promise<ProjectResolution> => {
  const configuration = await Configuration.find(cwd, plugins)
  const { project, workspace } = await Project.find(configuration, cwd)

  return { configuration, project, workspace }
}
