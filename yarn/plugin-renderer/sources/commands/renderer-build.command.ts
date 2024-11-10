import type { PortablePath } from '@yarnpkg/fslib'

import { PassThrough }       from 'node:stream'

import { BaseCommand }       from '@yarnpkg/cli'
import { Configuration }     from '@yarnpkg/core'
import { StreamReport }      from '@yarnpkg/core'
import { MessageName }       from '@yarnpkg/core'
import { execUtils }         from '@yarnpkg/core'
import { xfs }               from '@yarnpkg/fslib'
import { ppath }             from '@yarnpkg/fslib'

export class RendererBuildCommand extends BaseCommand {
  static paths = [['renderer', 'build']]

  async execute(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await report.startTimerPromise('Renderer build', async () => {
          const stdout = new PassThrough()
          const stderr = new PassThrough()

          stdout.on('data', (data: Buffer) => {
            data
              .toString()
              .split('\n')
              .filter(Boolean)
              .forEach((line) => {
                report.reportInfo(MessageName.UNNAMED, line)
              })
          })

          stderr.on('data', (data: Buffer) => {
            data
              .toString()
              .split('\n')
              .filter(Boolean)
              .forEach((line) => {
                report.reportInfo(MessageName.UNNAMED, line)
              })
          })

          try {
            await xfs.writeJsonPromise(ppath.join(this.context.cwd, 'src/package.json'), {
              type: 'module',
            })

            await execUtils.pipevp('yarn', ['next', 'build', 'src', '--no-lint'], {
              end: execUtils.EndStrategy.ErrorCode,
              cwd: this.context.cwd,
              stdin: this.context.stdin,
              stdout,
              stderr,
            })
          } catch (error) {
            report.reportError(
              MessageName.UNNAMED,
              error instanceof Error ? error.message : 'Build error'
            )
          } finally {
            await xfs.removePromise(ppath.join(this.context.cwd, 'src/package.json'))
          }
        })

        await report.startTimerPromise('Copy standalone files', async () => {
          if (await xfs.existsPromise(ppath.join(this.context.cwd, 'dist'))) {
            await xfs.rmdirPromise(ppath.join(this.context.cwd, 'dist'), { recursive: true })
          }

          await xfs.copyPromise(
            ppath.join(this.context.cwd, 'dist'),
            ppath.join(
              this.context.cwd,
              'src/.next/standalone',
              this.context.cwd.replace(`${configuration.projectCwd!}/`, '') as PortablePath,
              'src'
            )
          )
        })

        await report.startTimerPromise('Copy static files', async () => {
          await xfs.copyPromise(
            ppath.join(this.context.cwd, 'dist/.next/static'),
            ppath.join(this.context.cwd, 'src/.next/static')
          )
        })

        await report.startTimerPromise('Copy edge chunks files', async () => {
          if (
            await xfs.existsPromise(ppath.join(this.context.cwd, 'src/.next/server/edge-chunks'))
          ) {
            await xfs.copyPromise(
              ppath.join(this.context.cwd, 'dist/.next/server/edge-chunks'),
              ppath.join(this.context.cwd, 'src/.next/server/edge-chunks')
            )
          }
        })

        await report.startTimerPromise('Move server start files', async () => {
          await xfs.movePromise(
            ppath.join(this.context.cwd, 'dist/server.js'),
            ppath.join(this.context.cwd, 'dist/index.js')
          )
        })
      }
    )

    return commandReport.exitCode()
  }
}
