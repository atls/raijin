import { Cli, Command }        from 'clipanion'

import { BuildLibraryCommand } from './build-library.command'
import { BuildPluginCommand }  from './build-plugin.command'

const cli = new Cli({
  binaryLabel: `Tools Builder`,
  binaryName: `builder`,
})

cli.register(BuildLibraryCommand)
cli.register(BuildPluginCommand)

cli.register(Command.Entries.Help)
cli.register(Command.Entries.Version)

cli.runExit(process.argv.slice(2), Cli.defaultContext)
