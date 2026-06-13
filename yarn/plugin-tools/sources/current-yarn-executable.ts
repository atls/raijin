import type { Project }                   from '@yarnpkg/core'
import type { Locator }                   from '@yarnpkg/core'
import type { Filename }                  from '@yarnpkg/fslib'
import type { PortablePath }              from '@yarnpkg/fslib'

import { join }                           from 'node:path'

import { scriptUtils }                    from '@yarnpkg/core'
import { npath }                          from '@yarnpkg/fslib'
import { ppath }                          from '@yarnpkg/fslib'
import { xfs }                            from '@yarnpkg/fslib'

import { MANAGED_NODE_LOADER_ENV }        from './managed-node-loader.js'
import { applyManagedNodeLoader }         from './managed-node-loader.js'
import { createManagedNodeWrapperSource } from './managed-node-loader.js'

const YARN_EXECUTABLE_NAME = (process.platform === 'win32' ? 'yarn.cmd' : 'yarn') as Filename
const NODE_EXECUTABLE_NAME = (process.platform === 'win32' ? 'node.cmd' : 'node') as Filename
const YARN_EXECUTABLE_NAMES: Array<Filename> =
  process.platform === 'win32'
    ? ['yarn.cmd' as Filename, 'yarnpkg.cmd' as Filename]
    : ['yarn' as Filename, 'yarnpkg' as Filename]

type ScriptEnvOptions = Parameters<typeof scriptUtils.makeScriptEnv>[0]

export interface CurrentYarnExecutableOptions {
  binFolder: ScriptEnvOptions['binFolder']
  project: Project
  locator?: Locator
  env?: NodeJS.ProcessEnv
  nodeLoader?: string
}

export interface CurrentYarnExecutable {
  executable: string
  env: NodeJS.ProcessEnv
}

const shellQuote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`

const createExecutableWrapper = (argv0: string, args: Array<string>): string => {
  if (process.platform === 'win32') {
    return `@echo off\r\n"${argv0}" ${args.map((arg) => `"${arg.replaceAll('"', '""')}"`).join(' ')} %*\r\n`
  }

  return `#!/bin/sh\nexec ${shellQuote(argv0)} ${args.map(shellQuote).join(' ')} "$@"\n`
}

export const resolveCurrentYarnPath = (project: Project): PortablePath | null => {
  const yarnPath = project.configuration.get('yarnPath')

  if (!yarnPath) {
    return null
  }

  return ppath.isAbsolute(yarnPath) ? yarnPath : ppath.join(project.cwd, yarnPath)
}

const materializeCurrentYarnWrappers = async (
  binFolder: string,
  project: Project,
  nodeLoader?: string
): Promise<void> => {
  const yarnPath = resolveCurrentYarnPath(project)

  if (!yarnPath) {
    return
  }

  const portableBinFolder = npath.toPortablePath(binFolder)
  const yarnWrapper = createExecutableWrapper(process.execPath, [npath.fromPortablePath(yarnPath)])

  await Promise.all([
    ...(nodeLoader
      ? [
          xfs.writeFilePromise(
            ppath.join(portableBinFolder, NODE_EXECUTABLE_NAME),
            createExecutableWrapper(process.execPath, ['-e', createManagedNodeWrapperSource()]),
            { mode: 0o755 }
          ),
        ]
      : []),
    ...YARN_EXECUTABLE_NAMES.map(async (name) =>
      xfs.writeFilePromise(ppath.join(portableBinFolder, name), yarnWrapper, {
        mode: 0o755,
      })),
  ])
}

export const makeCurrentYarnExecutable = async ({
  binFolder,
  locator,
  project,
  env = {},
  nodeLoader,
}: CurrentYarnExecutableOptions): Promise<CurrentYarnExecutable> => {
  const scriptEnv = await scriptUtils.makeScriptEnv({
    binFolder,
    locator,
    project,
    ignoreCorepack: true,
  })

  const executableEnv = {
    ...scriptEnv,
    ...env,
    ...(nodeLoader ? { [MANAGED_NODE_LOADER_ENV]: nodeLoader } : {}),
  }

  applyManagedNodeLoader(executableEnv)

  await materializeCurrentYarnWrappers(scriptEnv.BERRY_BIN_FOLDER, project, nodeLoader)

  return {
    executable: join(scriptEnv.BERRY_BIN_FOLDER, YARN_EXECUTABLE_NAME),
    env: executableEnv,
  }
}
