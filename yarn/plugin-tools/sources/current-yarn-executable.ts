import type { Project } from '@yarnpkg/core'

import { join }         from 'node:path'

import { scriptUtils }  from '@yarnpkg/core'

const YARN_EXECUTABLE_NAME = process.platform === 'win32' ? 'yarn.cmd' : 'yarn'

type ScriptEnvOptions = Parameters<typeof scriptUtils.makeScriptEnv>[0]

export interface CurrentYarnExecutableOptions {
  binFolder: ScriptEnvOptions['binFolder']
  project: Project
  env?: NodeJS.ProcessEnv
}

export interface CurrentYarnExecutable {
  executable: string
  env: NodeJS.ProcessEnv
}

export const makeCurrentYarnExecutable = async ({
  binFolder,
  project,
  env = {},
}: CurrentYarnExecutableOptions): Promise<CurrentYarnExecutable> => {
  const scriptEnv = await scriptUtils.makeScriptEnv({
    binFolder,
    project,
    ignoreCorepack: true,
  })

  return {
    executable: join(scriptEnv.BERRY_BIN_FOLDER, YARN_EXECUTABLE_NAME),
    env: {
      ...scriptEnv,
      ...env,
    },
  }
}
