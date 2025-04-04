/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LocatorHash }       from '@yarnpkg/core'
import type { Package }           from '@yarnpkg/core'
import type { Workspace }         from '@yarnpkg/core'

import { readFileSync }           from 'node:fs'
import { writeFileSync }          from 'node:fs'
import { join }                   from 'node:path'

import { BaseCommand }            from '@yarnpkg/cli'
import { WorkspaceRequiredError } from '@yarnpkg/cli'
import { StreamReport }           from '@yarnpkg/core'
import { Configuration }          from '@yarnpkg/core'
import { Project }                from '@yarnpkg/core'
import { structUtils }            from '@yarnpkg/core'
import { miscUtils }              from '@yarnpkg/core'

import { SpinnerProgress }        from '@atls/yarn-run-utils'

import { BADGES }                 from './badges.constants.js'
import { COLORS }                 from './badges.constants.js'

class BadgesCommand extends BaseCommand {
  static paths = [['badges', 'generate']]

  static VERSIONS_SEPARATOR = '[//]: # (VERSIONS)'

  static BADGE_URL = 'https://img.shields.io/static/v1'

  static BADGE_STYLE = 'for-the-badge'

  static REGISTRY_URL = 'https://npmjs.com'

  static REGISTRY_PACKAGE_PATH = '/package'

  async execute(): Promise<0 | 1> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project, workspace: projectWorkspace } = await Project.find(
      configuration,
      this.context.cwd
    )

    if (!projectWorkspace) throw new WorkspaceRequiredError(project.cwd, this.context.cwd)

    await project.restoreInstallState()

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await report.startTimerPromise('Generating badges', async () => {
          const progress = new SpinnerProgress(this.context.stdout, configuration)

          progress.start()

          const traverseWorkspace = (workspace: Workspace): IterableIterator<Package> => {
            const initialHash = workspace.anchoredLocator.locatorHash

            const seen = new Map<LocatorHash, Package>()
            const pass = [initialHash]

            while (pass.length > 0) {
              const hash = pass.shift()
              if (hash) {
                // eslint-disable-next-line no-continue
                if (seen.has(hash)) continue

                const pkg = project.storedPackages.get(hash)
                if (typeof pkg === `undefined`)
                  throw new Error(`Assertion failed: Expected the package to be registered`)

                seen.set(hash, pkg)

                if (structUtils.isVirtualLocator(pkg))
                  pass.push(structUtils.devirtualizeLocator(pkg).locatorHash)

                // eslint-disable-next-line no-continue, security/detect-possible-timing-attacks
                if (hash !== initialHash) continue

                for (const dependency of pkg.dependencies.values()) {
                  const resolution = project.storedResolutions.get(dependency.descriptorHash)
                  if (typeof resolution === `undefined`)
                    throw new Error(`Assertion failed: Expected the resolution to be registered`)

                  pass.push(resolution)
                }
              }
            }

            return seen.values()
          }

          const traverseAllWorkspaces = (): IterableIterator<Package> => {
            const aggregate = new Map<LocatorHash, Package>()

            for (const workspace of project.workspaces)
              for (const pkg of traverseWorkspace(workspace)) aggregate.set(pkg.locatorHash, pkg)

            return aggregate.values()
          }

          const lookupSet = traverseAllWorkspaces()
          const sortedLookup = miscUtils.sortMap([...lookupSet], (pkg) =>
            structUtils.stringifyLocator(pkg))

          const getVersion = async (name: string): Promise<string> => {
            const expectedDescriptor = structUtils.parseDescriptor(name)

            const selection = sortedLookup.filter(
              (pkg) =>
                pkg.scope === expectedDescriptor.scope && pkg.name === expectedDescriptor.name
            )

            if (selection.length > 0) {
              return selection.shift()?.version || ''
            }

            return ''
          }

          const readmePath = join(process.cwd(), 'README.md')
          // eslint-disable-next-line n/no-sync
          const readme = readFileSync(readmePath).toString('utf-8')

          const parts = readme.split(BadgesCommand.VERSIONS_SEPARATOR)

          const atlsVersions = await Promise.all(
            BADGES.map(async (badge) => ({
              name: badge,
              version: await getVersion(badge),
            }))
          )

          const versionsReducer = (badges: any, pkg: any): any => {
            const getColors = (): any => {
              const extractColors = (colors: any): any => ({
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                labelColor: colors.labelColor.replace('#', ''),
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                color: colors.color.replace('#', ''),
              })

              const pair = Object.entries(COLORS).find(
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                ([pattern]) => pkg.name.search(pattern) !== -1
              )

              if (pair) {
                const [, colors] = pair

                return extractColors(colors)
              }

              return extractColors(COLORS.tools)
            }

            if (pkg.version) {
              const packageLink = `${BadgesCommand.REGISTRY_URL}${BadgesCommand.REGISTRY_PACKAGE_PATH}/${pkg.name}`
              join(
                BadgesCommand.REGISTRY_URL,
                BadgesCommand.REGISTRY_PACKAGE_PATH,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                pkg.name
              )

              const newQueryStringParams = new URLSearchParams(
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                {
                  style: BadgesCommand.BADGE_STYLE,
                  label: pkg.name,
                  message: pkg.version,
                  ...getColors(),
                }
              )

              const badge = `<img src="${
                BadgesCommand.BADGE_URL
              }?${newQueryStringParams.toString()}" alt='badge'>`

              const wrapWithLink = (content: string, link: string): string =>
                `[${content}](${link})`

              return `${badges}${wrapWithLink(badge, packageLink)}  `
            }

            return badges
          }

          parts[1] = atlsVersions.reduce(versionsReducer, '')
          parts[1] = `\n\n${parts[1]}\n\n`

          // eslint-disable-next-line n/no-sync
          writeFileSync(readmePath, parts.join('[//]: # (VERSIONS)'))

          progress.end()
        })
      }
    )

    return commandReport.exitCode()
  }
}

export { BadgesCommand }
