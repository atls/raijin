import { Command }                  from 'clipanion'
import { Option }                   from 'clipanion'
import { PassThrough }              from 'stream'

import { watch }                    from '@atls/code-service'
import { StartServerPlugin }        from '@atls/webpack-start-server-plugin'
import { StartServerPluginOptions } from '@atls/webpack-start-server-plugin'

import { PrettyLogsTransform }      from '@atls/cli-ui-pretty-logs'

const waitSignals = (watcher): Promise<void> =>
  new Promise((resolve) => {
    process.on('SIGINT', () => {
      watcher.close(() => resolve())
    })

    process.on('SIGTERM', () => {
      watcher.close(() => resolve())
    })
  })

class ServiceDevCommand extends Command {
  static paths = [['service', 'dev']]

  prettyLogs = Option.Boolean(`-p,--pretty-logs`, false)

  source = Option.String(`-s,--source`)

  async execute() {
    const startServerPluginArgs: Partial<StartServerPluginOptions> = {}

    if (this.prettyLogs) {
      const formatter = new PassThrough()

      startServerPluginArgs.stdout = formatter
      startServerPluginArgs.stderr = formatter

      formatter.pipe(new PrettyLogsTransform()).pipe(process.stdout)
    } else {
      startServerPluginArgs.stdout = this.context.stdout
      startServerPluginArgs.stderr = this.context.stderr
    }

    const plugins = [
      {
        name: 'start-server',
        use: StartServerPlugin,
        args: [startServerPluginArgs],
      },
    ]

    const watcher = await watch(
      { cwd: this.source || process.cwd() },
      plugins,
      (error): undefined => {
        if (error) {
          this.context.stdout.write(error)
        }

        return undefined
      }
    )

    await waitSignals(watcher)
  }
}

export { ServiceDevCommand }
