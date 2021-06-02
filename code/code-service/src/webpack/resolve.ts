import { Configuration }          from '@yarnpkg/core'
import { Project }                from '@yarnpkg/core'
import { PortablePath }           from '@yarnpkg/fslib'
import { getPluginConfiguration } from '@yarnpkg/cli'

export const getResolveAliases = async (cwd: string) => {
  const configuration = await Configuration.find(
    process.cwd() as PortablePath,
    getPluginConfiguration()
  )

  const { project } = await Project.find(configuration, process.cwd() as PortablePath)

  const workspace = project.getWorkspaceByFilePath(cwd as PortablePath)

  return workspace?.manifest?.raw?.resolve?.alias || []
}
