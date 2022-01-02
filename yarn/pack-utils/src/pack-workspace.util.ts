import { Workspace }    from '@yarnpkg/core'
import { Report }       from '@yarnpkg/core'
import { PortablePath } from '@yarnpkg/fslib'
import { ppath }        from '@yarnpkg/fslib'
import { xfs }          from '@yarnpkg/fslib'
import { packUtils }    from '@yarnpkg/plugin-pack'

export const packWorkspace = async (
  workspace: Workspace,
  destination: PortablePath,
  report: Report,
  overwrite: boolean = false
): Promise<void> => {
  await packUtils.prepareForPack(workspace, { report }, async () => {
    const files = await packUtils.genPackList(workspace)
    const progress = Report.progressViaCounter(files.length)
    const reportedProgress = report.reportProgress(progress)

    try {
      for (const file of files) {
        const src = ppath.join(workspace.cwd, file)
        const dest = ppath.join(destination, workspace.relativeCwd, file)

        report.reportInfo(null, file)

        // eslint-disable-next-line no-await-in-loop
        await xfs.copyPromise(dest, src, { overwrite })

        progress.tick()
      }
    } finally {
      reportedProgress.stop()
    }
  })
}
