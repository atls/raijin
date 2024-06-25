import type { Tunnel }   from 'localtunnel'

import { BaseCommand }   from '@yarnpkg/cli'
import { Configuration } from '@yarnpkg/core'
import { Project }       from '@yarnpkg/core'
import { Option }        from 'clipanion'
import spawn             from 'cross-spawn'
import localtunnel       from 'localtunnel'

export class RendererDevCommand extends BaseCommand {
  static paths = [['renderer', 'dev']]

  tunnel = Option.Boolean('--tunnel')

  #tunnel: Tunnel

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

  async execute(): Promise<void> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    spawn('yarn', ['next', 'dev', 'src'], { stdio: 'inherit', cwd: this.context.cwd })

    if (this.tunnel) {
      const workspace = project.getWorkspaceByCwd(this.context.cwd)

      const { tunnel: config }: { tunnel: { host?: string; port?: number } } =
        workspace.manifest.raw.tools || {}

      if (!config?.host) {
        throw new Error('Tunnel host not configured')
      }

      this.startTunnel(config.host, config.port)
    }
  }
}
