import { PassThrough }                         from 'node:stream'

import { BaseCommand }                         from '@yarnpkg/cli'
import { StreamReport }                        from '@yarnpkg/core'
import { MessageName }                         from '@yarnpkg/core'
import { execUtils }                           from '@yarnpkg/core'
import { scriptUtils }                         from '@yarnpkg/core'
import { xfs }                                 from '@yarnpkg/fslib'

import { resolveWorkspaceInvocation }          from '@atls/raijin/commands'
import { createYarnExecutable }                from '@atls/raijin/commands'
import { materializeNextConfigAdapter }        from '@atls/raijin/config/next'

import { cleanupDiscoveryArtifacts }           from '../artifact/cleanup.js'
import { cleanupSourceArtifacts }              from '../artifact/cleanup.js'
import { cleanupTargetArtifacts }              from '../artifact/cleanup.js'
import { materializeEntrypoint }               from '../artifact/entrypoint.js'
import { createArtifactLayout }                from '../artifact/layout.js'
import { createArtifactTarget }                from '../artifact/layout.js'
import { assertArtifactSource }                from '../artifact/materialization.js'
import { copyEdgeChunks }                      from '../artifact/materialization.js'
import { copyPublicAssets }                    from '../artifact/materialization.js'
import { copyStandalone }                      from '../artifact/materialization.js'
import { copyStaticAssets }                    from '../artifact/materialization.js'
import { assertNextBuildExitCode }             from '../integrations/next/execution/arguments.js'
import { createNextBuildArguments }            from '../integrations/next/execution/arguments.js'
import { createNextExecutionEnvironment }      from '../integrations/next/execution/environment.js'
import { extractPnpLoaderOption }              from '../integrations/next/execution/environment.js'
import { resolvePnpLoader }                    from '../integrations/next/execution/environment.js'
import { materializeNextLoader }               from '../integrations/next/execution/loader.js'
import { resolveNextPackageVersion }           from '../integrations/next/execution/version.js'
import { resolveNextStandaloneArtifactSource } from '../integrations/next/standalone/discovery.js'
import { snapshotNextStandaloneManifests }     from '../integrations/next/standalone/discovery.js'

export class RendererBuildCommand extends BaseCommand {
  static override paths = [['renderer', 'build']]

  static override usage = BaseCommand.Usage({
    description: 'build a renderer production artifact',
  })

  async execute(): Promise<number> {
    await cleanupDiscoveryArtifacts(this.context.cwd)

    const { executionCwd, workspace, yarn } = await resolveWorkspaceInvocation(
      this.context.cwd,
      this.context.plugins
    )
    const { configuration, project } = yarn
    const rendererCwd = executionCwd
    const artifactTarget = createArtifactTarget(rendererCwd)

    await cleanupTargetArtifacts(artifactTarget)

    await project.restoreInstallState()

    const binFolder = await xfs.mktempPromise()
    const manifestSnapshot = await snapshotNextStandaloneManifests(artifactTarget.appCwd)

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

          const executableContext = {
            binFolder,
            locator: workspace.anchoredLocator,
            project,
          }
          const scriptEnvironment = await createYarnExecutable(executableContext)
          const { nodeOptions } = extractPnpLoaderOption(scriptEnvironment.env.NODE_OPTIONS)
          const loader = await resolvePnpLoader(project.cwd, scriptEnvironment.env.NODE_OPTIONS)
          const binaries = await scriptUtils.getWorkspaceAccessibleBinaries(workspace)
          const nextBinary = binaries.get('next')

          if (!nextBinary) {
            throw new Error('Renderer build requires Next.js 16 or newer')
          }

          const [nextPackage, nextBin] = nextBinary
          const nextVersion = resolveNextPackageVersion(nextPackage)
          const nextLoader = await materializeNextLoader(binFolder, loader)
          const nextConfigAdapterPath = await materializeNextConfigAdapter({ cwd: binFolder })
          const { executable, env } = await createYarnExecutable({
            ...executableContext,
            env: {
              NODE_OPTIONS: nodeOptions,
            },
            nodeLoader: nextLoader,
          })

          const { code } = await execUtils.pipevp(
            executable,
            createNextBuildArguments(nextVersion, nextBin),
            {
              end: execUtils.EndStrategy.ErrorCode,
              cwd: rendererCwd,
              stdin: this.context.stdin,
              stdout,
              stderr,
              env: createNextExecutionEnvironment(env, nextLoader, rendererCwd, {
                nextConfigAdapterPath,
                output: 'standalone',
              }),
            }
          )

          assertNextBuildExitCode(code)
        })

        const artifactSource = await resolveNextStandaloneArtifactSource(
          artifactTarget.appCwd,
          manifestSnapshot
        )
        const artifactLayout = createArtifactLayout(artifactTarget, artifactSource)

        await assertArtifactSource(artifactLayout)

        await report.startTimerPromise('Copy standalone files', async () => {
          await copyStandalone(artifactLayout)
        })

        await report.startTimerPromise('Copy static files', async () => {
          await copyStaticAssets(artifactLayout)
        })

        await report.startTimerPromise('Copy public assets', async () => {
          await copyPublicAssets(artifactLayout)
        })

        await report.startTimerPromise('Copy edge chunks files', async () => {
          await copyEdgeChunks(artifactLayout)
        })

        await report.startTimerPromise('Create server entrypoint', async () => {
          await materializeEntrypoint(artifactLayout)
        })

        await report.startTimerPromise('Clean source build artifacts', async () => {
          await cleanupSourceArtifacts(artifactLayout)
        })
      }
    )

    return commandReport.exitCode()
  }
}
