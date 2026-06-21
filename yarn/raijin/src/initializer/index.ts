import type { RunRaijinInitializerOptions } from './interface.js'

import { RaijinInitializerUsageException }  from './exceptions/usage.js'
import { installRaijinRuntime }             from '../runtime/installer.js'
import { runYarnCommand }                   from '../yarn/command.js'
import { ensurePackageManifest }            from './project.js'
import { ensureYarnLock }                   from './project.js'

const CODE_RUNTIME_PACKAGE = '@atls/code-runtime@latest'

export const runRaijinInitializer = async ({
  argv = [],
  cwd = process.cwd(),
  fetchImpl = fetch,
  runYarnCommand: runCommand = runYarnCommand,
}: RunRaijinInitializerOptions = {}): Promise<void> => {
  const command = argv[0]

  if (argv.length > 1 || (command && command !== 'init')) {
    throw new RaijinInitializerUsageException()
  }

  const runtimeManifest = await installRaijinRuntime({ cwd, fetchImpl })
  await ensurePackageManifest(cwd, runtimeManifest.packageManager)
  await ensureYarnLock(cwd)
  await runCommand(['add', '-D', CODE_RUNTIME_PACKAGE], cwd)
  await runCommand(['generate', 'project'], cwd)
  await runCommand(['raijin', 'sync'], cwd)
}
