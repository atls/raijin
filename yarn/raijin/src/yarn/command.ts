import type { YarnCommandRunner }        from './runner.js'

import { RaijinYarnCommandException }    from './exceptions/command.js'
import { executeChildProcess }           from '../commands/invocation/adapters/child-process.js'
import { createLauncherBaseEnvironment } from './launcher.js'

export const createYarnCommandEnvironment = (
  cwd: string,
  environment: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv => {
  const yarnEnvironment = createLauncherBaseEnvironment(environment)

  yarnEnvironment.INIT_CWD = cwd
  yarnEnvironment.PROJECT_CWD = cwd

  return yarnEnvironment
}

export const runYarnCommand: YarnCommandRunner = async (
  args: Array<string>,
  cwd: string
): Promise<void> => {
  const environment = createYarnCommandEnvironment(cwd)
  const result = await executeChildProcess('yarn', args, {
    context: {
      environment,
      stderr: process.stderr,
      stdin: process.stdin,
      stdout: process.stdout,
    },
    cwd,
    env: environment,
  })

  if (result.exitCode !== 0) {
    throw new RaijinYarnCommandException(args)
  }
}
