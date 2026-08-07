import type { RunRaijinInitializerOptions } from './interface.js'

import { installRaijinRuntime }             from '../runtime/installer.js'
import { runYarnCommand }                   from '../yarn/command.js'
import { ensurePackageManifest }            from './project.js'
import { ensureYarnLock }                   from './project.js'
import { parseRaijinInitializerArguments }  from './scaffold.js'
import { selectRaijinScaffoldType }         from './scaffold.js'

const RAIJIN_PACKAGE = '@atls/raijin@latest'

export const runRaijinInitializer = async ({
  argv = [],
  cwd = process.cwd(),
  fetchImpl = fetch,
  runYarnCommand: runCommand = runYarnCommand,
  selectScaffoldType = selectRaijinScaffoldType,
}: RunRaijinInitializerOptions = {}): Promise<void> => {
  const { scaffoldType: parsedScaffoldType } = parseRaijinInitializerArguments(argv)
  const scaffoldType = parsedScaffoldType ?? (await selectScaffoldType())

  const runtimeManifest = await installRaijinRuntime({ cwd, fetchImpl })
  await ensurePackageManifest(cwd, runtimeManifest.packageManager)
  await ensureYarnLock(cwd)
  await runCommand(['add', '-D', RAIJIN_PACKAGE], cwd)
  await runCommand(['generate', 'project', '--type', scaffoldType], cwd)
  await runCommand(['raijin', 'sync'], cwd)
}
