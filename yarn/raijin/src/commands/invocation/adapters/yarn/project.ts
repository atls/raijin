import type { PluginConfiguration } from '@yarnpkg/core'
import type { PortablePath }        from '@yarnpkg/fslib'

import type { ProjectResolution }   from './project.interfaces.js'

import { Configuration }            from '@yarnpkg/core'
import { Project }                  from '@yarnpkg/core'

export const resolveProject = async (
  cwd: PortablePath,
  plugins: PluginConfiguration
): Promise<ProjectResolution> => {
  const configuration = await Configuration.find(cwd, plugins)
  const { project, workspace } = await Project.find(configuration, cwd)

  return { configuration, project, workspace }
}
