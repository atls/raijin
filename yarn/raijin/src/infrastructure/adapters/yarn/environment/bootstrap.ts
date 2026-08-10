import type * as YarnCore         from '@yarnpkg/core'
import type { Locator }           from '@yarnpkg/core'
import type { Project }           from '@yarnpkg/core'
import type { Filename }          from '@yarnpkg/fslib'
import type { PortablePath }      from '@yarnpkg/fslib'

import type { Environment }       from '../../node/execution/environment.interfaces.js'
import type { EnvironmentInput }  from '../../node/execution/environment.interfaces.js'
import type { BootstrapOptions }  from './bootstrap.interfaces.js'

import { createRequire }          from 'node:module'

import { npath }                  from '@yarnpkg/fslib'
import { ppath }                  from '@yarnpkg/fslib'
import { xfs }                    from '@yarnpkg/fslib'

import { merge }                  from '../../../process/environment/map.js'
import { set }                    from '../../../process/environment/map.js'
import { prepare as prepareBase } from './prepare.js'

const require = createRequire(import.meta.url)
const { scriptUtils } = require('@yarnpkg/core') as Pick<typeof YarnCore, 'scriptUtils'>

const quoteCommandArgument = (value: string): string => `"${value.replaceAll('"', '""')}"`

const quoteShellArgument = (value: string): string => `'${value.replaceAll("'", `'"'"'`)}'`

const writePackageCommand = async (
  folder: PortablePath,
  name: string,
  executable: string,
  arguments_: ReadonlyArray<string>
): Promise<void> => {
  if (process.platform === 'win32') {
    const command = [executable, ...arguments_].map(quoteCommandArgument).join(' ')

    await xfs.writeFilePromise(
      ppath.join(folder, `${name}.cmd` as Filename),
      `@goto #_undefined_# 2>NUL || @title %COMSPEC% & @setlocal & @${command} %*`
    )
  }

  const command = [executable, ...arguments_].map(quoteShellArgument).join(' ')

  await xfs.writeFilePromise(
    ppath.join(folder, name as Filename),
    `#!/bin/sh\nexec ${command} "$@"\n`,
    { mode: 0o755 }
  )
}

const installPackageCommands = async (
  folder: PortablePath,
  locator: Locator,
  project: Project
): Promise<void> => {
  const commands = await scriptUtils.getPackageAccessibleBinaries(locator, { project })

  await Promise.all(
    Array.from(commands, async ([name, [, executable, isScript]]) =>
      writePackageCommand(
        folder,
        name,
        isScript ? process.execPath : executable,
        isScript ? [executable] : []
      ))
  )
}

const prepare = async (
  input: EnvironmentInput,
  { baseEnvironment = process.env, locator, project }: BootstrapOptions
): Promise<NodeJS.ProcessEnv> => {
  const binFolder = npath.toPortablePath(input.binDirectory)

  if (locator) {
    await project.restoreInstallState()
  }

  const baseEnv = prepareBase(project.configuration.env, baseEnvironment, input.patch)
  const environment = merge([
    await scriptUtils.makeScriptEnv({
      baseEnv,
      binFolder,
      ignoreCorepack: true,
      locator,
      project,
    }),
  ])

  if (locator) {
    await installPackageCommands(binFolder, locator, project)
  }

  set(environment, 'INIT_CWD', input.cwd)
  set(environment, 'PROJECT_CWD', npath.fromPortablePath(project.cwd))

  return environment
}

export const create = (options: BootstrapOptions): Environment => ({
  prepare: async (input) => prepare(input, options),
})
