import { BaseCommand }     from '@yarnpkg/cli'
import { WorkspaceRequiredError }     from '@yarnpkg/cli'
import { StreamReport }    from '@yarnpkg/core'
import { Configuration }   from '@yarnpkg/core'
import { Project }   from '@yarnpkg/core'
import { structUtils }   from '@yarnpkg/core'
import { miscUtils }   from '@yarnpkg/core'
import { LocatorHash }   from '@yarnpkg/core'
import { Package }   from '@yarnpkg/core'
import { Workspace }   from '@yarnpkg/core'

import { readFileAsync }   from 'fs-extra-promise'
import { writeFileAsync }  from 'fs-extra-promise'
import { join }            from 'path'

import { SpinnerProgress } from '@atls/yarn-run-utils'

import { BADGES }          from './badges.constants'
import { COLORS }          from './badges.constants'

class BadgesCommand extends BaseCommand {
  static paths = [['badges', 'generate']]

  static VERSIONS_SEPARATOR = '[//]: # (VERSIONS)'

  static BADGE_URL = 'https://img.shields.io/static/v1'

  static BADGE_STYLE = 'for-the-badge'

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project, workspace } = await Project.find(configuration, this.context.cwd)

    if (!workspace)
      throw new WorkspaceRequiredError(project.cwd, this.context.cwd);

    await project.restoreInstallState();

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await report.startTimerPromise('Generating badges', async () => {
          const progress = new SpinnerProgress(this.context.stdout, configuration)

          progress.start()

          const traverseWorkspace = (workspace: Workspace) => {
            const initialHash = workspace.anchoredLocator.locatorHash;

            const seen = new Map<LocatorHash, Package>();
            const pass = [initialHash];

            while (pass.length > 0) {
              const hash = pass.shift()!;
              if (seen.has(hash))
                continue;

              const pkg = project.storedPackages.get(hash);
              if (typeof pkg === `undefined`)
                throw new Error(`Assertion failed: Expected the package to be registered`);

              seen.set(hash, pkg);

              if (structUtils.isVirtualLocator(pkg))
                pass.push(structUtils.devirtualizeLocator(pkg).locatorHash);

              if (hash !== initialHash)
                continue;

              for (const dependency of pkg.dependencies.values()) {
                const resolution = project.storedResolutions.get(dependency.descriptorHash);
                if (typeof resolution === `undefined`)
                  throw new Error(`Assertion failed: Expected the resolution to be registered`);

                pass.push(resolution);
              }
            }

            return seen.values();
          };

          const traverseAllWorkspaces = () => {
            const aggregate = new Map<LocatorHash, Package>();

            for (const workspace of project.workspaces)
              for (const pkg of traverseWorkspace(workspace))
                aggregate.set(pkg.locatorHash, pkg);

            return aggregate.values();
          };

          const lookupSet = traverseAllWorkspaces()
          const sortedLookup = miscUtils.sortMap([...lookupSet], pkg => {
            return structUtils.stringifyLocator(pkg)
          })

          const getVersion = async (name) => {
            const expectedDescriptor = structUtils.parseDescriptor(name)

            const selection = sortedLookup.filter(pkg => {
              if (pkg.scope === expectedDescriptor.scope && pkg.name === expectedDescriptor.name) {
                return true
              }

              return false
            })

            if (selection.length > 0) {
              return selection.shift()!.version
            }

            return ''
          }

          const readmePath = join(process.cwd(), 'README.md')
          const readme = (await readFileAsync(readmePath)).toString('utf-8')

          const parts = readme.split(BadgesCommand.VERSIONS_SEPARATOR)

          const atlsVersions = await Promise.all(
            BADGES.map(async (badge) => ({
              name: badge,
              version: await getVersion(badge),
            }))
          )

          parts[1] = atlsVersions.reduce((badges, pkg) => {
            const getColors = () => {
              const createQueryString = (colors) =>
                `labelColor=${colors.labelColor.replace('#', '')}&color=${colors.color.replace(
                  '#',
                  ''
                )}`

              const pair = Object.entries(COLORS).find(
                ([pattern]) => pkg.name.search(pattern) !== -1
              )

              if (pair) {
                const [, colors] = pair

                return createQueryString(colors)
              }

              return createQueryString(COLORS.tools)
            }

            if (pkg.version) {
              return `${badges}<img src="${BadgesCommand.BADGE_URL}?style=${
                BadgesCommand.BADGE_STYLE
              }&label=${encodeURIComponent(pkg.name)}&message=${pkg.version}&${getColors()}">\n`
            }

            return badges
          }, '')

          parts[1] = `\n\n${parts[1]}\n`

          await writeFileAsync(readmePath, parts.join('[//]: # (VERSIONS)'))

          progress.end()
        })
      }
    )

    return commandReport.exitCode()
  }
}

export { BadgesCommand }
