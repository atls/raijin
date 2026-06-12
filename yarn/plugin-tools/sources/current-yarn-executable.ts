import type { Project }      from '@yarnpkg/core'
import type { Filename }     from '@yarnpkg/fslib'
import type { PortablePath } from '@yarnpkg/fslib'

import { join }              from 'node:path'

import { scriptUtils }       from '@yarnpkg/core'
import { npath }             from '@yarnpkg/fslib'
import { ppath }             from '@yarnpkg/fslib'
import { xfs }               from '@yarnpkg/fslib'

const YARN_EXECUTABLE_NAME = process.platform === 'win32' ? 'yarn.cmd' : 'yarn'
const YARN_EXECUTABLE_NAMES: Array<Filename> =
  process.platform === 'win32'
    ? ['yarn.cmd' as Filename, 'yarnpkg.cmd' as Filename]
    : ['yarn' as Filename, 'yarnpkg' as Filename]

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

const shellQuote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`

const createCurrentYarnShim = (nodePath: string, yarnPath: string): string => {
  if (process.platform === 'win32') {
    return `@echo off\r\n"${nodePath}" "${yarnPath}" %*\r\n`
  }

  return `#!/bin/sh\nexec ${shellQuote(nodePath)} ${shellQuote(yarnPath)} "$@"\n`
}

export const resolveCurrentYarnPath = (project: Project): PortablePath | null => {
  const yarnPath = project.configuration.get('yarnPath')

  if (!yarnPath) {
    return null
  }

  return ppath.isAbsolute(yarnPath) ? yarnPath : ppath.join(project.cwd, yarnPath)
}

const materializeCurrentYarnShims = async (binFolder: string, project: Project): Promise<void> => {
  const yarnPath = resolveCurrentYarnPath(project)

  if (!yarnPath) {
    return
  }

  const shim = createCurrentYarnShim(process.execPath, npath.fromPortablePath(yarnPath))

  await Promise.all(
    YARN_EXECUTABLE_NAMES.map(async (name) => {
      await xfs.writeFilePromise(ppath.join(npath.toPortablePath(binFolder), name), shim, {
        mode: 0o755,
      })
    })
  )
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

  await materializeCurrentYarnShims(scriptEnv.BERRY_BIN_FOLDER, project)

  return {
    executable: join(scriptEnv.BERRY_BIN_FOLDER, YARN_EXECUTABLE_NAME),
    env: {
      ...scriptEnv,
      ...env,
    },
  }
}
