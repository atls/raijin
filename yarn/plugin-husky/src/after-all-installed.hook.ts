import { StreamReport } from '@yarnpkg/core'
import { MessageName }  from '@yarnpkg/core'
import { execUtils }    from '@yarnpkg/core'
import { Report }       from '@yarnpkg/core'
import { ppath }        from '@yarnpkg/fslib'
import { npath }        from '@yarnpkg/fslib'
import { xfs }          from '@yarnpkg/fslib'
import { isCI }         from 'ci-info'
import { EOL }          from 'os'

export const afterAllInstalled = async (project, { report }: { report: StreamReport }) => {
  const { devDependencies, dependencies } = project.topLevelWorkspace.manifest.raw

  const deps = [...Object.keys(dependencies || {}), ...Object.keys(devDependencies || {})]

  if (deps.includes('husky') && !isCI) {
    const installed = await xfs.existsPromise(
      ppath.join(project.cwd, npath.toPortablePath('.config/husky/_/husky.sh'))
    )

    if (!installed) {
      await report.startTimerPromise('Install husky hooks', async () => {
        const progress = Report.progressViaCounter(40)
        const reportedProgress = report.reportProgress(progress)
        const interval = setInterval(() => progress.tick(), 100)

        try {
          const { stdout, stderr } = await execUtils.execvp(
            'yarn',
            ['husky', 'install', '.config/husky'],
            {
              cwd: project.cwd,
            }
          )

          progress.set(40)

          if (stderr) {
            report.reportError(MessageName.UNNAMED, stderr.replace(EOL, ''))
          } else if (stdout) {
            report.reportInfo(null, stdout.replace(EOL, ''))
          }
        } catch {
          progress.set(40)
        } finally {
          clearInterval(interval)
          reportedProgress.stop()
        }
      })
    }
  }
}
