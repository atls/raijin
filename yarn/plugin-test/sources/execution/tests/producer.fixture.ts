import { getPluginConfiguration } from '@yarnpkg/cli'
import { npath }                  from '@yarnpkg/fslib'
import { Cli }                    from 'clipanion'

import { plugin }                 from '../../test.plugin.js'

const cli = Cli.from(plugin.commands ?? [], {
  binaryName: 'yarn',
  enableColors: false,
})

await cli.runExit(process.argv.slice(2), {
  cwd: npath.toPortablePath(process.cwd()),
  plugins: getPluginConfiguration(),
  quiet: false,
})
