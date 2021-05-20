import { TunnelConfig } from 'localtunnel'
import localtunnel      from 'localtunnel'
import { Writable }     from 'stream'

export interface WebpackLocalTunnelPluginOptions extends TunnelConfig {
  reconnect: boolean
  reconnectInterval: number
  stdout?: Writable
  stderr?: Writable
  port?: number
}

export class WebpackLocalTunnelPlugin {
  options: WebpackLocalTunnelPluginOptions

  constructor(options: Partial<WebpackLocalTunnelPluginOptions> = {}) {
    this.options = {
      reconnect: true,
      reconnectInterval: 1000,
      ...options,
    }
  }

  apply(compiler) {
    this.connect(
      this.options.port || 3000,
      {
        local_host: '127.0.0.1',
        ...this.options,
      },
      this.options.reconnect,
      this.options.reconnectInterval
    )
  }

  connect(port: number, options: TunnelConfig, reconnect: boolean, reconnectInterval: number) {
    localtunnel(port, options, (error, tunnel) => {
      if (error) {
        this.error(`Can't connect to tunnel: ${error}`)
      } else if (tunnel) {
        this.info(`Tunnel public url: ${tunnel.url}`)

        tunnel.on('error', (tunnelError) => {
          this.error(`Connection with tunnel lost: ${tunnelError.message}`)

          tunnel.close()

          if (reconnect) {
            this.info('Reconnection...')

            setTimeout(() => {
              this.connect(port, options, reconnect, reconnectInterval)
            }, reconnectInterval)
          }
        })
      } else {
        this.error('Tunnel not created')
      }
    })
  }

  info(body) {
    if (this.options.stdout) {
      this.options.stdout.write(
        Buffer.from(
          JSON.stringify({
            severityText: 'INFO',
            name: 'localtunnel',
            body,
          })
        )
      )
    }
  }

  error(body) {
    if (this.options.stderr) {
      this.options.stderr.write(
        Buffer.from(
          JSON.stringify({
            severityText: 'ERROR',
            name: 'localtunnel',
            body,
          })
        )
      )
    }
  }
}
