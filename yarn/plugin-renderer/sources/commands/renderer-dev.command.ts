import type { WorkspaceInvocation }       from '@atls/raijin/commands'
import type { Tunnel }                    from 'localtunnel'

import { BaseCommand }                    from '@yarnpkg/cli'
import { scriptUtils }                    from '@yarnpkg/core'
import { xfs }                            from '@yarnpkg/fslib'
import { ppath }                          from '@yarnpkg/fslib'
import { Option }                         from 'clipanion'
import localtunnel                        from 'localtunnel'

import { defineCommandInvocation }        from '@atls/raijin/commands'
import { materializeNextConfigAdapter }   from '@atls/raijin/config/next'

import { createNextDevArguments }         from '../integrations/next/execution/arguments.js'
import { createNextExecutionEnvironment } from '../integrations/next/execution/environment.js'
import { extractPnpLoaderOption }         from '../integrations/next/execution/environment.js'
import { resolvePnpLoader }               from '../integrations/next/execution/environment.js'
import { materializeNextLoader }          from '../integrations/next/execution/loader.js'
import { resolveNextPackageVersion }      from '../integrations/next/execution/version.js'

export class RendererDevCommand extends BaseCommand {
  static override paths = [['renderer', 'dev']]

  static raijinCommand = defineCommandInvocation({ scope: 'workspace' })

  static override usage = BaseCommand.Usage({
    description: 'run a renderer in development mode',
  })

  tunnel = Option.Boolean('--tunnel')

  https = Option.Boolean('--https')

  #tunnel?: Tunnel

  async runTunnel(host: string, port: number): Promise<void> {
    if (this.#tunnel) {
      this.#tunnel.close()
    }

    this.#tunnel = await localtunnel({ host, port })

    // eslint-disable-next-line no-console
    console.log('your url is: %s', this.#tunnel.url)
  }

  startTunnel(host: string, port: number = 3000): void {
    this.runTunnel(host, port)

    this.context.stdin.on('data', (data) => {
      if (String(data).trim() === 'rs') {
        this.runTunnel(host, port)
      }
    })
  }

  override async execute(invocation?: WorkspaceInvocation): Promise<number> {
    if (!invocation) {
      throw new Error('Command invocation context is missing')
    }

    const { executionCwd, workspace, yarn } = invocation
    const { project } = yarn

    await project.restoreInstallState()

    const binaries = await scriptUtils.getWorkspaceAccessibleBinaries(workspace)
    const nextBinary = binaries.get('next')

    if (!nextBinary) {
      throw new Error('Renderer dev requires Next.js')
    }

    const [nextPackage] = nextBinary
    const nextVersion = resolveNextPackageVersion(nextPackage)
    const args = createNextDevArguments(nextVersion)

    if (this.https) {
      if (!(await xfs.existsPromise(ppath.join(project.cwd, '.config/certs/local/dev.key')))) {
        throw new Error('Https key not found')
      }

      if (!(await xfs.existsPromise(ppath.join(project.cwd, '.config/certs/local/dev.crt')))) {
        throw new Error('Https cert not found')
      }

      args.push('--experimental-https')
      args.push('--experimental-https-key', ppath.join(project.cwd, '.config/certs/local/dev.key'))
      args.push('--experimental-https-cert', ppath.join(project.cwd, '.config/certs/local/dev.crt'))
    }

    if (this.tunnel) {
      const { tunnel: config }: { tunnel?: { host?: string; port?: number } } =
        workspace.manifest.raw.tools || {}

      if (!config?.host) {
        throw new Error('Tunnel host not configured')
      }

      this.startTunnel(config.host, config.port)
    }

    return yarn.execute(args, {
      locator: workspace.anchoredLocator,
      prepare: async ({ binFolder, environment }) => {
        const { nodeOptions } = extractPnpLoaderOption(environment.NODE_OPTIONS)
        const loader = await resolvePnpLoader(project.cwd, environment.NODE_OPTIONS)
        const nextLoader = await materializeNextLoader(binFolder, loader)
        const nextConfigAdapterPath = await materializeNextConfigAdapter({ cwd: binFolder })

        return {
          environment: { NODE_OPTIONS: nodeOptions },
          nodeLoader: nextLoader,
          finalizeEnvironment: (scriptEnvironment) =>
            createNextExecutionEnvironment(scriptEnvironment, nextLoader, executionCwd, {
              nextConfigAdapterPath,
            }),
        }
      },
    })
  }
}
