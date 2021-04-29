import { Cli }                    from 'clipanion'

import { TypeCheckCommand }       from '@atls/actl-typecheck'

import { binaryVersion }          from './constants'

const run = () => {
  const cli = new Cli({
    binaryLabel: `Atlantis Command Line Interface`,
    binaryName: `actl`,
    binaryVersion,
  })

  cli.register(TypeCheckCommand)

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
