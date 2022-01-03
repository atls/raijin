import { Configuration }         from '@yarnpkg/core'
import { Workspace }             from '@yarnpkg/core'
import { Project }               from '@yarnpkg/core'
import { Report }                from '@yarnpkg/core'
import { Cache }                 from '@yarnpkg/core'
import { Locator }               from '@yarnpkg/core'
import { PortablePath }          from '@yarnpkg/fslib'
import { structUtils }           from '@yarnpkg/core'
import { toFilename }            from '@yarnpkg/fslib'
import { xfs }                   from '@yarnpkg/fslib'
import { ppath }                 from '@yarnpkg/fslib'
import { npath }                 from '@yarnpkg/fslib'
import { patchUtils }            from '@yarnpkg/plugin-patch'

import { copyRcFile }            from './copy.utils'
import { copyPlugins }           from './copy.utils'
import { copyYarnRelease }       from './copy.utils'
import { copyManifests }         from './copy.utils'
import { copyCacheMarkedFiles }  from './copy.utils'
import { copyProtocolFiles }     from './copy.utils'
import { getRequiredWorkspaces } from './workspaces.utils'
import { clearUnusedWorkspaces } from './workspaces.utils'
import { packWorkspace }         from './workspaces.utils'

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

export function parseSpec(
  spec: string
): { parentLocator: Locator | null; path: PortablePath } | undefined {
  const { params, selector } = structUtils.parseRange(spec)

  const path = npath.toPortablePath(selector)

  const parentLocator =
    params && typeof params.locator === 'string' ? structUtils.parseLocator(params.locator) : null

  return { parentLocator, path }
}

export const pack = async (
  configuration: Configuration,
  project: Project,
  workspace: Workspace,
  report: Report,
  destination: PortablePath
) => {
  const requiredWorkspaces = getRequiredWorkspaces(project, [workspace], true)

  clearUnusedWorkspaces(project, requiredWorkspaces, true)

  const cache = await Cache.find(configuration)

  await report.startTimerPromise('Resolution Step', async () => {
    await project.resolveEverything({ report, cache })
  })

  await report.startTimerPromise('Fetch Step', async () => {
    await project.fetchEverything({ report, cache })
  })

  await xfs.mkdirpPromise(destination)

  await report.startTimerPromise('Copy RC files', async () => {
    await copyRcFile(project, destination, report)
  })

  await report.startTimerPromise('Copy plugins', async () => {
    await copyPlugins(project, destination, report)
  })

  await report.startTimerPromise('Copy Yarn releases', async () => {
    await copyYarnRelease(project, destination, report)
  })

  await report.startTimerPromise('Copy manifests', async () => {
    await copyManifests(project.workspaces, destination, report)
  })

  await report.startTimerPromise('Copy protocol files', async () => {
    await copyProtocolFiles(project, destination, report, (descriptor) => {
      if (descriptor.range.startsWith('exec:')) {
        const parsed = parseSpec(descriptor.range)

        if (parsed?.parentLocator) {
          return {
            parentLocator: parsed.parentLocator,
            paths: [parsed.path],
          }
        }

        return undefined
      }

      if (descriptor.range.startsWith('patch:')) {
        const { parentLocator, patchPaths: paths } = patchUtils.parseDescriptor(descriptor)

        if (parentLocator) {
          return { parentLocator, paths }
        }
      }

      return undefined
    })
  })

  await report.startTimerPromise('Copy cache marked files', async () => {
    await copyCacheMarkedFiles(project, cache, destination, report)
  })

  await generateLockfile(project, destination, report)

  for await (const ws of requiredWorkspaces) {
    const name = ws.manifest.name ? structUtils.stringifyIdent(ws.manifest.name) : ''

    await report.startTimerPromise(`Pack workspace ${name}`, async () => {
      await packWorkspace(ws, destination, report)
    })
  }
}
