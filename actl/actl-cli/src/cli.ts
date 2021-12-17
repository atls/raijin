import { Cli }                  from 'clipanion'

import { LibraryBuildCommand }  from '@atls/actl-library'
import { ServiceBuildCommand }  from '@atls/actl-service'
import { ServiceDevCommand }    from '@atls/actl-service'
import { RendererBuildCommand } from '@atls/actl-renderer'
import { RendererDevCommand }   from '@atls/actl-renderer'

import { binaryVersion }        from './constants'

const run = () => {
  const cli = new Cli({
    binaryLabel: `Atlantis Command Line Interface`,
    binaryName: `actl`,
    binaryVersion,
  })

  cli.register(ServiceBuildCommand)
  cli.register(ServiceDevCommand)

  cli.register(RendererBuildCommand)
  cli.register(RendererDevCommand)

  cli.register(LibraryBuildCommand)

  cli
    .runExit(process.argv.slice(2), {
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: process.stderr,
    })
    .catch((error) => {
      process.stdout.write(error.stack || error.message)
      process.exitCode = 1
    })
    .finally(() => process.exit())
}

export { run }
