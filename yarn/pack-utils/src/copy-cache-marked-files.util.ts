import { PortablePath } from '@yarnpkg/fslib'
import { xfs }          from '@yarnpkg/fslib'
import { ppath }        from '@yarnpkg/fslib'
import { Cache }        from '@yarnpkg/core'
import { Project }      from '@yarnpkg/core'
import { Report }       from '@yarnpkg/core'

export const copyCacheMarkedFiles = async (
  project: Project,
  cache: Cache,
  destination: PortablePath,
  report: Report
): Promise<void> => {
  // eslint-disable-next-line no-restricted-syntax
  for (const src of cache.markedFiles) {
    const path = ppath.relative(project.cwd, src)

    report.reportInfo(null, path)

    // eslint-disable-next-line no-await-in-loop
    await xfs.copyPromise(ppath.join(destination, path), src)
  }
}
