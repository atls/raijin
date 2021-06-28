import { BaseCommand }           from '@yarnpkg/cli'
import { Configuration }         from '@yarnpkg/core'
import { Project }               from '@yarnpkg/core'
import { Cache }                 from '@yarnpkg/core'
import { StreamReport }          from '@yarnpkg/core'
import { structUtils }           from '@yarnpkg/core'
import { PortablePath }          from '@yarnpkg/fslib'
import { xfs }                   from '@yarnpkg/fslib'
import { patchUtils }            from '@yarnpkg/plugin-patch'
import { Option }                from 'clipanion'

import { copyRcFile }            from '@atls/yarn-pack-utils'
import { copyPlugins }           from '@atls/yarn-pack-utils'
import { copyYarnRelease }       from '@atls/yarn-pack-utils'
import { copyManifests }         from '@atls/yarn-pack-utils'
import { copyCacheMarkedFiles }  from '@atls/yarn-pack-utils'
import { generateLockfile }      from '@atls/yarn-pack-utils'
import { copyProtocolFiles }     from '@atls/yarn-pack-utils'
import { parseSpec }             from '@atls/yarn-pack-utils'
import { getRequiredWorkspaces } from '@atls/yarn-pack-utils'
import { clearUnusedWorkspaces } from '@atls/yarn-pack-utils'
import { packWorkspace }         from '@atls/yarn-pack-utils'

class AppPackSourceCommand extends BaseCommand {
  static paths = [['app', 'pack', 'source']]

  destination: PortablePath = Option.String('-d,--destination', { required: true })

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)

    const { project } = await Project.find(configuration, this.context.cwd)

    const workspace = project.getWorkspaceByFilePath(this.context.cwd)

    const requiredWorkspaces = getRequiredWorkspaces(project, [workspace], true)

    clearUnusedWorkspaces(project, requiredWorkspaces, true)

    const cache = await Cache.find(configuration)

    const report = await StreamReport.start(
      {
        configuration,
        stdout: this.context.stdout,
      },
      // eslint-disable-next-line no-shadow
      async (report) => {
        await report.startTimerPromise('Resolution Step', async () => {
          await project.resolveEverything({ report, cache })
        })

        await report.startTimerPromise('Fetch Step', async () => {
          await project.fetchEverything({ report, cache })
        })

        await xfs.mkdirpPromise(this.destination)

        await report.startTimerPromise('Copy RC files', async () => {
          await copyRcFile(project, this.destination, report)
        })

        await report.startTimerPromise('Copy plugins', async () => {
          await copyPlugins(project, this.destination, report)
        })

        await report.startTimerPromise('Copy Yarn releases', async () => {
          await copyYarnRelease(project, this.destination, report)
        })

        await report.startTimerPromise('Copy manifests', async () => {
          await copyManifests(project.workspaces, this.destination, report)
        })

        await report.startTimerPromise('Copy protocol files', async () => {
          await copyProtocolFiles(project, this.destination, report, (descriptor) => {
            if (descriptor.range.startsWith('exec:')) {
              const parsed = parseSpec(descriptor.range)

              if (parsed?.parentLocator) {
                return {
                  parentLocator: parsed.parentLocator,
                  paths: [parsed.path],
                }
              }

              return undefined
              // eslint-disable-next-line no-else-return
            } else if (descriptor.range.startsWith('patch:')) {
              const { parentLocator, patchPaths: paths } = patchUtils.parseDescriptor(descriptor)

              if (parentLocator) {
                return { parentLocator, paths }
              }

              return undefined
            }

            return undefined
          })
        })

        await report.startTimerPromise('Copy cache marked files', async () => {
          await copyCacheMarkedFiles(project, cache, this.destination, report)
        })

        await generateLockfile(project, this.destination, report)

        // eslint-disable-next-line no-restricted-syntax
        for (const ws of requiredWorkspaces) {
          const name = ws.manifest.name ? structUtils.stringifyIdent(ws.manifest.name) : ''

          // eslint-disable-next-line no-await-in-loop
          await report.startTimerPromise(`Pack workspace ${name}`, async () => {
            await packWorkspace(ws, this.destination, report)
          })
        }
      }
    )

    return report.exitCode()
  }
}

export { AppPackSourceCommand }
