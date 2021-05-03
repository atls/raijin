import { Project }      from '@yarnpkg/core'
import { Report }       from '@yarnpkg/core'
import { PortablePath } from '@yarnpkg/fslib'
import { toFilename }   from '@yarnpkg/fslib'
import { xfs }          from '@yarnpkg/fslib'
import { ppath }        from '@yarnpkg/fslib'

export const generateLockfile = async (
  project: Project,
  destination: PortablePath,
  report: Report
): Promise<void> => {
  const filename = toFilename(project.configuration.get('lockfileFilename'))
  const dest = ppath.join(destination, filename)

  report.reportInfo(null, filename)

  await xfs.mkdirpPromise(ppath.dirname(dest))
  await xfs.writeFilePromise(dest, project.generateLockfile())
}
