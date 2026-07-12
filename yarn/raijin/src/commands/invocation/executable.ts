import type { Filename }                     from '@yarnpkg/fslib'

import type { YarnCommandExecutable }        from './invocation.interfaces.js'
import type { YarnCommandExecutableOptions } from './invocation.interfaces.js'
import type { YarnCommandOptions }           from './invocation.interfaces.js'

import { execUtils }                         from '@yarnpkg/core'
import { scriptUtils }                       from '@yarnpkg/core'
import { npath }                             from '@yarnpkg/fslib'
import { ppath }                             from '@yarnpkg/fslib'
import { xfs }                               from '@yarnpkg/fslib'

import { MANAGED_NODE_LOADER_ENV }           from '../../runtime/node/bootstrap/loader.js'
import { applyManagedNodeLoader }            from '../../runtime/node/bootstrap/loader.js'
import { sanitizeYarnCommandEnvironment }    from '../../yarn/command.js'

const YARN_EXECUTABLE_NAME = (process.platform === 'win32' ? 'yarn.cmd' : 'yarn') as Filename
const NODE_EXECUTABLE_NAME = (process.platform === 'win32' ? 'node.cmd' : 'node') as Filename

const shellQuote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`

const createExecutableWrapper = (argv0: string, args: Array<string>): string => {
  if (process.platform === 'win32') {
    return `@echo off\r\n"${argv0}" ${args.map((arg) => `"${arg.replaceAll('"', '""')}"`).join(' ')} %*\r\n`
  }

  return `#!/bin/sh\nexec ${shellQuote(argv0)} ${args.map(shellQuote).join(' ')} "$@"\n`
}

const materializeNodeWrapper = async (binFolder: string, nodeLoader?: string): Promise<void> => {
  if (!nodeLoader) {
    return
  }

  const portableBinFolder = npath.toPortablePath(binFolder)

  await xfs.writeFilePromise(
    ppath.join(portableBinFolder, NODE_EXECUTABLE_NAME),
    createExecutableWrapper(process.execPath, []),
    { mode: 0o755 }
  )
}

export const createYarnCommandExecutable = async ({
  binFolder,
  locator,
  project,
  env = {},
  nodeLoader,
}: YarnCommandExecutableOptions): Promise<YarnCommandExecutable> => {
  const scriptEnv = await scriptUtils.makeScriptEnv({
    binFolder,
    locator,
    project,
    ignoreCorepack: false,
  })
  const nodeOptions = [scriptEnv.NODE_OPTIONS, env.NODE_OPTIONS].filter(Boolean).join(' ')

  const executableEnv: NodeJS.ProcessEnv = {
    ...scriptEnv,
    ...env,
    ...(nodeOptions ? { NODE_OPTIONS: nodeOptions } : {}),
    ...(nodeLoader ? { [MANAGED_NODE_LOADER_ENV]: nodeLoader } : {}),
  }

  applyManagedNodeLoader(executableEnv)
  delete executableEnv.YARN_IGNORE_PATH

  await materializeNodeWrapper(scriptEnv.BERRY_BIN_FOLDER, nodeLoader)

  return {
    executable: YARN_EXECUTABLE_NAME,
    env: executableEnv,
  }
}

export const executeYarnCommand = async ({
  args,
  env,
  invocation,
  stderr,
  stdin,
  stdout,
}: YarnCommandOptions): Promise<number> => {
  const binFolder = await xfs.mktempPromise()
  const executable = await createYarnCommandExecutable({
    binFolder,
    env,
    project: invocation.project,
  })
  const executableEnv = sanitizeYarnCommandEnvironment(executable.env, { preservePnp: true })

  executableEnv.INIT_CWD = invocation.cwd.invocation.native
  executableEnv.PROJECT_CWD = npath.fromPortablePath(invocation.project.cwd)

  const { code } = await execUtils.pipevp(executable.executable, args, {
    cwd: invocation.cwd.execution.portable,
    env: executableEnv,
    stderr,
    stdin,
    stdout,
  })

  return code
}
