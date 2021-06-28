import { Cli }                 from 'clipanion'
import { Builtins }            from 'clipanion'

import { BuildLibraryCommand } from './build-library.command'
import { BuildPluginCommand }  from './build-plugin.command'

const cli = new Cli({
  binaryLabel: `Tools Builder`,
  binaryName: `builder`,
})

cli.register(BuildLibraryCommand)
cli.register(BuildPluginCommand)

cli.register(Builtins.HelpCommand)
cli.register(Builtins.VersionCommand)

cli.runExit(process.argv.slice(2), Cli.defaultContext)
