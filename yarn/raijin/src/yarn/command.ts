import type { YarnCommandRunner }        from './runner.js'

import { spawn }                         from 'node:child_process'

import { RaijinYarnCommandException }    from './exceptions/command.js'
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
  const child = spawn('yarn', args, {
    cwd,
    env: createYarnCommandEnvironment(cwd),
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', resolve)
  })

  if (exitCode !== 0) {
    throw new RaijinYarnCommandException(args)
  }
}
