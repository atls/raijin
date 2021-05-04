import { PortablePath } from '@yarnpkg/fslib'
import { xfs }          from '@yarnpkg/fslib'
import { ppath }        from '@yarnpkg/fslib'
import { toFilename }   from '@yarnpkg/fslib'
import { Project }      from '@yarnpkg/core'
import { Report }       from '@yarnpkg/core'

export const copyPlugins = async (
  project: Project,
  destination: PortablePath,
  report: Report
): Promise<void> => {
  const pluginDir = ppath.join(toFilename('.yarn'), toFilename('plugins'))

  report.reportInfo(null, pluginDir)

  await xfs.copyPromise(ppath.join(destination, pluginDir), ppath.join(project.cwd, pluginDir), {
    overwrite: true,
  })
}
