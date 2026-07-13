import type { Tunnel }                                   from 'localtunnel'

import { BaseCommand }                                   from '@yarnpkg/cli'
import { execUtils }                                     from '@yarnpkg/core'
import { scriptUtils }                                   from '@yarnpkg/core'
import { xfs }                                           from '@yarnpkg/fslib'
import { ppath }                                         from '@yarnpkg/fslib'
import { Option }                                        from 'clipanion'
import localtunnel                                       from 'localtunnel'

import { resolveWorkspaceInvocation }                    from '@atls/raijin/commands'
import { createYarnExecutable }                          from '@atls/raijin/commands'

import { createRendererBuildEnv }                        from './renderer-build.utils.js'
import { extractNodeLoaderOption }                       from './renderer-build.utils.js'
import { materializeNextCompiledConfRequireCacheLoader } from './renderer-build.utils.js'
import { resolveNextPackageVersion }                     from './renderer-build.utils.js'
import { resolveRendererBuildPnpLoader }                 from './renderer-build.utils.js'
import { shouldUseWebpackRendererRoute }                 from './renderer-build.utils.js'

const RENDERER_NEXT_APP_DIR = 'src'

export const createRendererDevArgs = (nextVersion: string | undefined): Array<string> => {
  const args = ['next', 'dev', RENDERER_NEXT_APP_DIR]

  // TODO(atls/raijin#629): replace the explicit webpack renderer route with the
  // planned Turbopack contract once the Raijin v3 Next dev stream owns it.
  if (shouldUseWebpackRendererRoute(nextVersion)) {
    args.push('--webpack')
  }

  return args
}

export class RendererDevCommand extends BaseCommand {
  static override paths = [['renderer', 'dev']]

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

    process.stdin.on('data', (data) => {
      if (data.toString().trim() === 'rs') {
        this.runTunnel(host, port)
      }
    })
  }

  async execute(): Promise<number> {
    const { executionCwd, workspace, yarn } = await resolveWorkspaceInvocation(
      this.context.cwd,
      this.context.plugins
    )
    const { project } = yarn

    await project.restoreInstallState()

    const binaries = await scriptUtils.getWorkspaceAccessibleBinaries(workspace)
    const nextBinary = binaries.get('next')

    if (!nextBinary) {
      throw new Error('Renderer dev requires Next.js')
    }

    const [nextPackage] = nextBinary
    const nextVersion = resolveNextPackageVersion(nextPackage)
    const args = createRendererDevArgs(nextVersion)

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

    const binFolder = await xfs.mktempPromise()
    const scriptEnvironment = await createYarnExecutable({
      binFolder,
      locator: workspace.anchoredLocator,
      project,
    })
    const { nodeOptions } = extractNodeLoaderOption(scriptEnvironment.env.NODE_OPTIONS)
    const loader = await resolveRendererBuildPnpLoader(
      project.cwd,
      scriptEnvironment.env.NODE_OPTIONS
    )
    const nextCompiledConfRequireCacheLoader = await materializeNextCompiledConfRequireCacheLoader(
      binFolder,
      loader
    )
    const { executable, env } = await createYarnExecutable({
      binFolder,
      locator: workspace.anchoredLocator,
      project,
      env: {
        NODE_OPTIONS: nodeOptions,
      },
      nodeLoader: nextCompiledConfRequireCacheLoader,
    })

    if (this.tunnel) {
      const { tunnel: config }: { tunnel?: { host?: string; port?: number } } =
        workspace.manifest.raw.tools || {}

      if (!config?.host) {
        throw new Error('Tunnel host not configured')
      }

      this.startTunnel(config.host, config.port)
    }

    const { code } = await execUtils.pipevp(executable, args, {
      cwd: executionCwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      env: createRendererBuildEnv(env, nextCompiledConfRequireCacheLoader, executionCwd),
    })

    return code
  }
}
