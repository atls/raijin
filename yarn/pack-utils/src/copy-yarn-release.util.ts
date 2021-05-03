import { PortablePath } from '@yarnpkg/fslib'
import { xfs }          from '@yarnpkg/fslib'
import { ppath }        from '@yarnpkg/fslib'
import { Project }      from '@yarnpkg/core'
import { Report }       from '@yarnpkg/core'

export const copyYarnRelease = async (
  project: Project,
  destination: PortablePath,
  report: Report
): Promise<void> => {
  const src = project.configuration.get('yarnPath')
  const path = ppath.relative(project.cwd, src)
  const dest = ppath.join(destination, path)

  report.reportInfo(null, path)

  await xfs.copyPromise(dest, src, {
    overwrite: true,
  })
}
