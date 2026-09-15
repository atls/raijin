import type { WorkspaceCommandContext }        from '@atls/raijin/commands'

import { PassThrough }                         from 'node:stream'

import { BaseCommand }                         from '@yarnpkg/cli'
import { StreamReport }                        from '@yarnpkg/core'
import { MessageName }                         from '@yarnpkg/core'
import { execUtils }                           from '@yarnpkg/core'
import { scriptUtils }                         from '@yarnpkg/core'
import { xfs }                                 from '@yarnpkg/fslib'

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
import { assertNextBuildExitCode }             from '../integrations/next/launcher/arguments.js'
import { createNextBuildArguments }            from '../integrations/next/launcher/arguments.js'
import { createNextExecutable }                from '../integrations/next/launcher/executable.js'
import { resolveNextPackageVersion }           from '../integrations/next/launcher/version.js'
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
    await cleanupDiscoveryArtifacts(invocation.invocationCwd)

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

          await xfs.mktempPromise(async (binFolder) => {
            const createOutput = (): PassThrough => {
              const stream = new PassThrough()

              stream.on('data', (data: Buffer) => {
                data
                  .toString()
                  .split('\n')
                  .filter(Boolean)
                  .forEach((line) => {
                    report.reportInfo(MessageName.UNNAMED, line)
                  })
              })

              return stream
            }
            const { executable, env } = await createNextExecutable({
              baseEnvironment: this.context.env,
              binFolder,
              locator: workspace.anchoredLocator,
              output: 'standalone',
              project,
              rendererCwd,
            })
            const { code } = await execUtils.pipevp(
              executable,
              createNextBuildArguments(nextVersion, nextBin),
              {
                cwd: rendererCwd,
                env,
                stderr: createOutput(),
                stdin: this.context.stdin,
                stdout: createOutput(),
              }
            )

            assertNextBuildExitCode(code)
          })
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
