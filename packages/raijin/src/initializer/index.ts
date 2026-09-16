import type { RunRaijinInitializerOptions } from './interface.js'

import { installRaijin }                    from '../installation/install.js'
import { runYarnCommand }                   from '../yarn/command.js'
import { hasRaijinPackage }                 from './project.js'
import { parseRaijinInitializerArguments }  from './scaffold.js'
import { selectRaijinScaffoldType }         from './scaffold.js'

export const runRaijinInitializer = async ({
  argv = [],
  cwd = process.cwd(),
  fetchImpl = fetch,
  runYarnCommand: runCommand = runYarnCommand,
  queryYarnPackage,
  readYarnCommand,
  selectScaffoldType = selectRaijinScaffoldType,
}: RunRaijinInitializerOptions = {}): Promise<void> => {
  const { mode, scaffoldType: parsedScaffoldType } = parseRaijinInitializerArguments(argv)
  const configured = await hasRaijinPackage(cwd)
  const bootstrap = mode === 'init' && !configured
  const scaffoldType = bootstrap ? (parsedScaffoldType ?? (await selectScaffoldType())) : undefined

  if (mode === 'update' && !configured) {
    throw new Error('Raijin update requires an installed @atls/raijin package')
  }

  await installRaijin({
    cwd,
    fetchImpl,
    mode: bootstrap ? 'bootstrap' : 'update',
    queryYarnPackage,
    readYarnCommand,
    runYarnCommand: runCommand,
  })

  if (scaffoldType) {
    await runCommand(['generate', 'project', '--type', scaffoldType], cwd)
  }
}
