import type { YarnCommandRunner } from './yarn-command.interfaces.js'

import { spawn }                  from 'node:child_process'

export const createYarnCommandEnvironment = (
  environment: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv => {
  const yarnEnvironment = { ...environment }

  delete yarnEnvironment.YARN_IGNORE_PATH

  return yarnEnvironment
}

export const runYarnCommand: YarnCommandRunner = async (
  args: Array<string>,
  cwd: string
): Promise<void> => {
  const child = spawn('yarn', args, {
    cwd,
    env: createYarnCommandEnvironment(),
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', resolve)
  })

  if (exitCode !== 0) {
    throw new Error(`Command failed: yarn ${args.join(' ')}`)
  }
}
