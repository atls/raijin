import type { Tunnel }   from 'localtunnel'

import { BaseCommand }   from '@yarnpkg/cli'
import { Configuration } from '@yarnpkg/core'
import { Project }       from '@yarnpkg/core'
import { xfs }           from '@yarnpkg/fslib'
import { ppath }         from '@yarnpkg/fslib'
import { Option }        from 'clipanion'
import spawn             from 'cross-spawn'
import localtunnel       from 'localtunnel'

export class RendererDevCommand extends BaseCommand {
  static paths = [['renderer', 'dev']]

  tunnel = Option.Boolean('--tunnel')

  https = Option.Boolean('--https')

  #tunnel!: Tunnel

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

    const args = ['next', 'dev', 'src']

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

    spawn('yarn', args, { stdio: 'inherit', cwd: this.context.cwd })

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
