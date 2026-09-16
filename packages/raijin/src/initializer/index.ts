import type { RunRaijinInitializerOptions } from './interface.js'

import { installRaijin }                    from '../installation/install.js'
import { runYarnCommand }                   from '../yarn/command.js'
import { hasRaijinPackage }                 from './project.js'
import { hasPackageJson }                   from './project.js'
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
  const hasManifest = await hasPackageJson(cwd)
  const bootstrap = mode === 'init' && !configured
  const scaffoldType = bootstrap ? (parsedScaffoldType ?? (await selectScaffoldType())) : undefined

  if (mode === 'update' && !hasManifest) {
    throw new Error('Raijin update requires an existing package.json')
  }

  let installationMode: 'bootstrap' | 'onboard' | 'update' = 'onboard'

  if (bootstrap) {
    installationMode = 'bootstrap'
  } else if (configured) {
    installationMode = 'update'
  }

  await installRaijin({
    cwd,
    fetchImpl,
    mode: installationMode,
    queryYarnPackage,
    readYarnCommand,
    runYarnCommand: runCommand,
  })

  if (scaffoldType) {
    await runCommand(['generate', 'project', '--type', scaffoldType], cwd)
  }
}
