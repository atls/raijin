import { PassThrough }                                   from 'node:stream'

import { BaseCommand }                                   from '@yarnpkg/cli'
import { StreamReport }                                  from '@yarnpkg/core'
import { MessageName }                                   from '@yarnpkg/core'
import { execUtils }                                     from '@yarnpkg/core'
import { scriptUtils }                                   from '@yarnpkg/core'
import { xfs }                                           from '@yarnpkg/fslib'
import { ppath }                                         from '@yarnpkg/fslib'

import { resolveWorkspaceCommandContext } from '@atls/yarn-plugin-tools/command-context'
import { makeCurrentYarnExecutable } from '@atls/yarn-plugin-tools/current-yarn-executable'

import { RENDERER_STANDALONE_SERVER_ENTRYPOINT }         from './renderer-build.constants.js'
import { assertRendererBuildExitCode }                   from './renderer-build.utils.js'
import { cleanupRendererBuildSourceArtifacts }           from './renderer-build.utils.js'
import { cleanupRendererBuildStaleArtifacts }            from './renderer-build.utils.js'
import { cleanupRendererBuildWorkspaceManifests }        from './renderer-build.utils.js'
import { copyRendererBuildPublicAssets }                 from './renderer-build.utils.js'
import { createRendererBuildArgs }                       from './renderer-build.utils.js'
import { createRendererBuildEnv }                        from './renderer-build.utils.js'
import { extractNodeLoaderOption }                       from './renderer-build.utils.js'
import { materializeNextCompiledConfRequireCacheLoader } from './renderer-build.utils.js'
import { resolveRendererBuildPnpLoader }                 from './renderer-build.utils.js'
import { resolveNextPackageVersion }                     from './renderer-build.utils.js'
import { resolveRendererBuildStandaloneWorkspaceCwd }    from './renderer-build.utils.js'

export class RendererBuildCommand extends BaseCommand {
  static paths = [['renderer', 'build']]

  async execute(): Promise<number> {
    const {
      configuration,
      project,
      workspace,
      workspaceCwd: rendererCwd,
    } = await resolveWorkspaceCommandContext(this.context.cwd, this.context.plugins)

    await cleanupRendererBuildStaleArtifacts(rendererCwd)

    await project.restoreInstallState()

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

          await xfs.writeJsonPromise(ppath.join(rendererCwd, 'src/package.json'), {
            type: 'module',
          })

          try {
            const binFolder = await xfs.mktempPromise()
            const executableContext = {
              binFolder,
              locator: workspace.anchoredLocator,
              project,
            }
            const scriptEnvironment = await makeCurrentYarnExecutable(executableContext)
            const { nodeOptions } = extractNodeLoaderOption(scriptEnvironment.env.NODE_OPTIONS)
            const loader = await resolveRendererBuildPnpLoader(
              project.cwd,
              scriptEnvironment.env.NODE_OPTIONS
            )
            const binaries = await scriptUtils.getWorkspaceAccessibleBinaries(workspace)
            const nextBinary = binaries.get('next')

            if (!nextBinary) {
              throw new Error('Renderer build requires Next.js 16 or newer')
            }

            const [nextPackage, nextBin] = nextBinary
            const nextVersion = resolveNextPackageVersion(nextPackage)
            const nextCompiledConfRequireCacheLoader =
              await materializeNextCompiledConfRequireCacheLoader(binFolder, loader)
            const { executable, env } = await makeCurrentYarnExecutable({
              ...executableContext,
              env: {
                NODE_OPTIONS: nodeOptions,
              },
              nodeLoader: nextCompiledConfRequireCacheLoader,
            })

            const { code } = await execUtils.pipevp(
              executable,
              createRendererBuildArgs(nextVersion, nextBin),
              {
                end: execUtils.EndStrategy.ErrorCode,
                cwd: rendererCwd,
                stdin: this.context.stdin,
                stdout,
                stderr,
                env: createRendererBuildEnv(env, nextCompiledConfRequireCacheLoader),
              }
            )

            assertRendererBuildExitCode(code)
          } finally {
            await xfs.removePromise(ppath.join(rendererCwd, 'src/package.json'))
          }
        })

        await report.startTimerPromise('Copy standalone files', async () => {
          const standaloneWorkspaceCwd = resolveRendererBuildStandaloneWorkspaceCwd(
            project.cwd,
            rendererCwd
          )

          await xfs.copyPromise(
            ppath.join(rendererCwd, 'dist'),
            ppath.join(standaloneWorkspaceCwd, 'src')
          )
        })

        await report.startTimerPromise('Clean workspace manifests', async () => {
          await cleanupRendererBuildWorkspaceManifests(rendererCwd)
        })

        await report.startTimerPromise('Copy static files', async () => {
          await xfs.copyPromise(
            ppath.join(rendererCwd, 'dist/.next/static'),
            ppath.join(rendererCwd, 'src/.next/static')
          )
        })

        await report.startTimerPromise('Copy public assets', async () => {
          await copyRendererBuildPublicAssets(rendererCwd)
        })

        await report.startTimerPromise('Copy edge chunks files', async () => {
          if (await xfs.existsPromise(ppath.join(rendererCwd, 'src/.next/server/edge-chunks'))) {
            await xfs.copyPromise(
              ppath.join(rendererCwd, 'dist/.next/server/edge-chunks'),
              ppath.join(rendererCwd, 'src/.next/server/edge-chunks')
            )
          }
        })

        await report.startTimerPromise('Move server start files', async () => {
          await xfs.movePromise(
            ppath.join(rendererCwd, 'dist/server.js'),
            ppath.join(rendererCwd, 'dist', RENDERER_STANDALONE_SERVER_ENTRYPOINT)
          )
        })

        await report.startTimerPromise('Clean source build artifacts', async () => {
          await cleanupRendererBuildSourceArtifacts(rendererCwd)
        })
      }
    )

    return commandReport.exitCode()
  }
}
