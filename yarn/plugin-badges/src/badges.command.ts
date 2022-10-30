import { BaseCommand }     from '@yarnpkg/cli'
import { StreamReport }    from '@yarnpkg/core'
import { Configuration }   from '@yarnpkg/core'

import { exec }            from 'child-process-promise'
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

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await report.startTimerPromise('Generating badges', async () => {
          const progress = new SpinnerProgress(this.context.stdout, configuration)

          progress.start()

          const getVersion = async (pkg) => {
            try {
              const raw = await exec(`yarn info ${pkg} --json`)
              return JSON.parse(raw.stdout).children.Version
            } catch (e) {
              return ''
            }
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
