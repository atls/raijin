import { PortablePath } from '@yarnpkg/fslib'
import { xfs }          from '@yarnpkg/fslib'
import { ppath }        from '@yarnpkg/fslib'
import { Workspace }    from '@yarnpkg/core'
import { Manifest }     from '@yarnpkg/core'
import { Report }       from '@yarnpkg/core'

export const copyManifests = async (
  workspaces: Workspace[],
  destination: PortablePath,
  report: Report
): Promise<void> => {
  // eslint-disable-next-line no-restricted-syntax
  for (const ws of workspaces) {
    const path = ppath.join(ws.relativeCwd, Manifest.fileName)
    const dest = ppath.join(destination, path)
    const data = {}

    ws.manifest.exportTo(data)

    report.reportInfo(null, path)

    // eslint-disable-next-line no-await-in-loop
    await xfs.mkdirpPromise(ppath.dirname(dest))

    // eslint-disable-next-line no-await-in-loop
    await xfs.writeJsonPromise(dest, data)
  }
}
