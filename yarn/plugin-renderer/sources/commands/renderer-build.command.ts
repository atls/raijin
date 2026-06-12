import type { PortablePath }                             from '@yarnpkg/fslib'

import { PassThrough }                                   from 'node:stream'

import { BaseCommand }                                   from '@yarnpkg/cli'
import { Configuration }                                 from '@yarnpkg/core'
import { Project }                                       from '@yarnpkg/core'
import { StreamReport }                                  from '@yarnpkg/core'
import { MessageName }                                   from '@yarnpkg/core'
import { execUtils }                                     from '@yarnpkg/core'
import { xfs }                                           from '@yarnpkg/fslib'
import { ppath }                                         from '@yarnpkg/fslib'

import { makeCurrentYarnExecutable }                     from '@atls/yarn-plugin-tools/current-yarn-executable'

import { assertRendererBuildExitCode }                   from './renderer-build.utils.js'
import { cleanupRendererBuildSourceArtifacts }           from './renderer-build.utils.js'
import { cleanupRendererBuildStaleArtifacts }            from './renderer-build.utils.js'
import { cleanupRendererBuildWorkspaceManifests }        from './renderer-build.utils.js'
import { createRendererBuildEnv }                        from './renderer-build.utils.js'
import { materializeNextCompiledConfRequireCacheLoader } from './renderer-build.utils.js'

export class RendererBuildCommand extends BaseCommand {
  static paths = [['renderer', 'build']]

  async execute(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)

    await cleanupRendererBuildStaleArtifacts(this.context.cwd)

    const { project } = await Project.find(configuration, this.context.cwd)

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

          await xfs.writeJsonPromise(ppath.join(this.context.cwd, 'src/package.json'), {
            type: 'module',
          })

          try {
            const binFolder = await xfs.mktempPromise()
            const { executable, env } = await makeCurrentYarnExecutable({ binFolder, project })
            const nextCompiledConfRequireCacheLoader =
              await materializeNextCompiledConfRequireCacheLoader(binFolder)

            const { code } = await execUtils.pipevp(
              executable,
              ['next', 'build', 'src', '--no-lint'],
              {
                end: execUtils.EndStrategy.ErrorCode,
                cwd: this.context.cwd,
                stdin: this.context.stdin,
                stdout,
                stderr,
                env: createRendererBuildEnv(env, nextCompiledConfRequireCacheLoader),
              }
            )

            assertRendererBuildExitCode(code)
          } finally {
            await xfs.removePromise(ppath.join(this.context.cwd, 'src/package.json'))
          }
        })

        await report.startTimerPromise('Copy standalone files', async () => {
          await xfs.copyPromise(
            ppath.join(this.context.cwd, 'dist'),
            ppath.join(
              this.context.cwd,
              'src/.next/standalone',
              this.context.cwd.replace(`${configuration.projectCwd || ''}/`, '') as PortablePath,
              'src'
            )
          )
        })

        await report.startTimerPromise('Clean workspace manifests', async () => {
          await cleanupRendererBuildWorkspaceManifests(this.context.cwd)
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

        await report.startTimerPromise('Clean source build artifacts', async () => {
          await cleanupRendererBuildSourceArtifacts(this.context.cwd)
        })
      }
    )

    return commandReport.exitCode()
  }
}
