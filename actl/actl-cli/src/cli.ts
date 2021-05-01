import { Cli }                    from 'clipanion'

import { LintCommand }            from '@atls/actl-lint'
import {FormatCommand}            from '@atls/actl-format'
import { TypeCheckCommand }       from '@atls/actl-typecheck'
import {TestIntegrationCommand} from '@atls/actl-test'
import {TestUnitCommand} from '@atls/actl-test'

import { binaryVersion }          from './constants'

const run = () => {
  const cli = new Cli({
    binaryLabel: `Atlantis Command Line Interface`,
    binaryName: `actl`,
    binaryVersion,
  })

  cli.register(LintCommand)
  cli.register(FormatCommand)
  cli.register(TypeCheckCommand)

  cli.register(TestIntegrationCommand)
  cli.register(TestUnitCommand)

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
