import type { RunRaijinInitializerOptions } from './interfaces.js'

import { RaijinInitializerUsageException }  from './exceptions/usage.js'
import { installRaijinRuntime }             from '../runtime/installer.js'
import { runYarnCommand }                   from '../yarn/command.js'
import { ensurePackageJson }                from './project.js'
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

  await ensurePackageJson(cwd)
  await ensureYarnLock(cwd)
  await installRaijinRuntime({ cwd, fetchImpl })
  await runCommand(['add', '-D', CODE_RUNTIME_PACKAGE], cwd)
  await runCommand(['generate', 'project'], cwd)
  await runCommand(['tools', 'sync'], cwd)
}
