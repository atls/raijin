import type { YarnCommandRunner }        from './runner.js'

import { RaijinYarnCommandException }    from './exceptions/command.js'
import { executeProcess }                from '../commands/invocation/adapters/execa/execute.js'
import { assertProcessCompleted }        from '../commands/invocation/execution/result.js'
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
  const result = await executeProcess('yarn', args, {
    context: {
      environment,
      stderr: process.stderr,
      stdin: process.stdin,
      stdout: process.stdout,
    },
    cwd,
    env: environment,
  })

  assertProcessCompleted(result)

  if (result.exitCode !== 0) {
    throw new RaijinYarnCommandException(args)
  }
}
