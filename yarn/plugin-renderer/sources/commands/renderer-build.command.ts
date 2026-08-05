import type { WorkspaceCommandContext }        from '@atls/raijin/commands'

import { BaseCommand }                         from '@yarnpkg/cli'
import { StreamReport }                        from '@yarnpkg/core'
import { MessageName }                         from '@yarnpkg/core'
import { scriptUtils }                         from '@yarnpkg/core'

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
import { createNextExecutionEnvironmentPatch } from '../integrations/next/execution/environment.js'
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

  declare context: WorkspaceCommandContext

  override async execute(): Promise<number> {
    const { invocation } = this.context
    await cleanupDiscoveryArtifacts(this.context.cwd)

    const { executionCwd, workspace, yarn } = invocation
    const { configuration, project } = yarn
    const rendererCwd = executionCwd
    const artifactTarget = createArtifactTarget(rendererCwd)

    await cleanupTargetArtifacts(artifactTarget)

    await project.restoreInstallState()

    const manifestSnapshot = await snapshotNextStandaloneManifests(artifactTarget.appCwd)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await report.startTimerPromise('Renderer build', async () => {
          const binaries = await scriptUtils.getWorkspaceAccessibleBinaries(workspace)
          const nextBinary = binaries.get('next')

          if (!nextBinary) {
            throw new Error('Renderer build requires Next.js 16 or newer')
          }

          const [nextPackage, nextBin] = nextBinary
          const nextVersion = resolveNextPackageVersion(nextPackage)
          const code = await yarn.execute(createNextBuildArguments(nextVersion, nextBin), {
            locator: workspace.anchoredLocator,
            output: {
              mode: 'handle',
              handler: ({ data }) => {
                data
                  .split('\n')
                  .filter(Boolean)
                  .forEach((line) => {
                    report.reportInfo(MessageName.UNNAMED, line)
                  })
              },
            },
            prepare: async ({ binFolder, nodeOptions: yarnNodeOptions }) => {
              const { nodeOptions } = extractPnpLoaderOption(yarnNodeOptions)
              const loader = await resolvePnpLoader(project.cwd, yarnNodeOptions)
              const nextLoader = await materializeNextLoader(binFolder, loader)
              const nextConfigAdapterPath = await materializeNextConfigAdapter({ cwd: binFolder })

              return {
                environmentPatch: createNextExecutionEnvironmentPatch(rendererCwd, {
                  nextConfigAdapterPath,
                  output: 'standalone',
                }),
                nodeLoader: nextLoader,
                nodeOptions: nodeOptions ?? null,
              }
            },
          })

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
