import type { Locator }      from '@yarnpkg/core'
import type { Project }      from '@yarnpkg/core'
import type { Filename }     from '@yarnpkg/fslib'
import type { PortablePath } from '@yarnpkg/fslib'

import { scriptUtils }       from '@yarnpkg/core'
import { ppath }             from '@yarnpkg/fslib'
import { xfs }               from '@yarnpkg/fslib'

interface InstallOptions {
  folder: PortablePath
  locator: Locator
  project: Project
}

interface Wrapper {
  arguments: ReadonlyArray<string>
  executable: string
  name: string
}

const quoteCommandArgument = (value: string): string => `"${value.replaceAll('"', '""')}"`

const quoteShellArgument = (value: string): string => `'${value.replaceAll("'", `'"'"'`)}'`

export const createCommandWrapper = (
  executable: string,
  arguments_: ReadonlyArray<string>
): string => {
  const command = [quoteCommandArgument(executable), ...arguments_.map(quoteCommandArgument)].join(
    ' '
  )

  return `@goto #_undefined_# 2>NUL || @title %COMSPEC% & @setlocal & @${command} %*`
}

export const createShellWrapper = (
  executable: string,
  arguments_: ReadonlyArray<string>
): string => {
  const command = [executable, ...arguments_].map(quoteShellArgument).join(' ')

  return `#!/bin/sh\nexec ${command} "$@"\n`
}

const write = async (
  folder: PortablePath,
  name: string,
  executable: string,
  arguments_: ReadonlyArray<string>
): Promise<void> => {
  if (process.platform === 'win32') {
    await xfs.writeFilePromise(
      ppath.join(folder, `${name}.cmd` as Filename),
      createCommandWrapper(executable, arguments_)
    )
  }

  await xfs.writeFilePromise(
    ppath.join(folder, name as Filename),
    createShellWrapper(executable, arguments_),
    { mode: 0o755 }
  )
}

const resolveWrappers = async ({ locator, project }: InstallOptions): Promise<Array<Wrapper>> =>
  Array.from(await scriptUtils.getPackageAccessibleBinaries(locator, { project }), ([
    name,
    [, executable, isScript],
  ]) => ({
    arguments: isScript ? [executable] : [],
    executable: isScript ? process.execPath : executable,
    name,
  }))

export const install = async (options: InstallOptions): Promise<void> => {
  await Promise.all(
    (await resolveWrappers(options)).map(async (wrapper) => {
      await write(options.folder, wrapper.name, wrapper.executable, wrapper.arguments)
    })
  )
}
