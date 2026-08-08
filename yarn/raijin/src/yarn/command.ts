import type { YarnCommandRunner }        from './runner.js'

import { RaijinYarnCommandException }    from './exceptions/command.js'
import { assertProcessCompleted } from '../commands/invocation/capabilities/assert-process-completed.js'
import { createExecaProcessExecutor }    from '../infrastructure/process/execa/executor.js'
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
  const executor = createExecaProcessExecutor({
    stderr: process.stderr,
    stdin: process.stdin,
    stdout: process.stdout,
  })
  const result = await executor.execute('yarn', args, {
    cwd,
    environment,
  })

  assertProcessCompleted(result)

  if (result.exitCode !== 0) {
    throw new RaijinYarnCommandException(args)
  }
}
