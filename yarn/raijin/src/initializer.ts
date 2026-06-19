import type { RunRaijinInitializerOptions } from './initializer.interfaces.js'

import { installRaijinRuntime }             from './runtime-installer.js'
import { runYarnCommand }                   from './yarn-command.js'

const CODE_RUNTIME_PACKAGE = '@atls/code-runtime@latest'

export const runRaijinInitializer = async ({
  argv = [],
  cwd = process.cwd(),
  fetchImpl = fetch,
  runYarnCommand: runCommand = runYarnCommand,
}: RunRaijinInitializerOptions = {}): Promise<void> => {
  const command = argv[0]

  if (argv.length > 1 || (command && command !== 'init')) {
    throw new Error('Usage: yarn init @atls/raijin or yarn dlx @atls/raijin init')
  }

  await installRaijinRuntime({ cwd, fetchImpl })
  await runCommand(['add', '-D', CODE_RUNTIME_PACKAGE], cwd)
  await runCommand(['generate', 'project'], cwd)
  await runCommand(['tools', 'sync'], cwd)
}
