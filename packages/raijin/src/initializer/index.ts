import type { RunRaijinInitializerOptions } from './input.js'

import { installRaijin }                    from '../installation/install.js'
import { hasRaijinBootstrapStage }          from '../installation/install.js'
import { runYarnCommand }                   from '../yarn/command.js'
import { assertRaijinProjectModuleType }    from './project.js'
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
  const unfinishedBootstrap = await hasRaijinBootstrapStage(cwd)
  const bootstrap = mode === 'init' && (!configured || unfinishedBootstrap)
  const scaffoldType = bootstrap ? (parsedScaffoldType ?? (await selectScaffoldType())) : undefined

  if (mode === 'update' && !hasManifest) {
    throw new Error('Raijin update requires an existing package.json')
  }

  await assertRaijinProjectModuleType(cwd)

  if (mode === 'update' && unfinishedBootstrap) {
    throw new Error('Raijin bootstrap is staged; rerun init to finish the scaffold')
  }

  let installationMode: 'bootstrap' | 'onboard' | 'update' = 'onboard'

  if (bootstrap) {
    installationMode = 'bootstrap'
  } else if (configured) {
    installationMode = 'update'
  }

  await installRaijin({
    afterActivated: scaffoldType
      ? async (packageManager) => {
          await runCommand(['generate', 'project', '--type', scaffoldType], cwd, {
            packageManager,
            followYarnPath: true,
          })
        }
      : undefined,
    cwd,
    fetchImpl,
    mode: installationMode,
    queryYarnPackage,
    readYarnCommand,
    runYarnCommand: runCommand,
  })
}
