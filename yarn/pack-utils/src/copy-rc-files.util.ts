import { Project }      from '@yarnpkg/core'
import { Report }       from '@yarnpkg/core'
import { PortablePath } from '@yarnpkg/fslib'
import { xfs }          from '@yarnpkg/fslib'
import { ppath }        from '@yarnpkg/fslib'

export const copyRcFile = async (
  project: Project,
  destination: PortablePath,
  report: Report
): Promise<void> => {
  const filename = project.configuration.get('rcFilename')

  report.reportInfo(null, filename)

  await xfs.copyPromise(ppath.join(destination, filename), ppath.join(project.cwd, filename), {
    overwrite: true,
  })
}
