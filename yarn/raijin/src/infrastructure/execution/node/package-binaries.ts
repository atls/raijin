import type { Filename }                      from '@yarnpkg/fslib'

import type { InstallPackageBinariesOptions } from './package-binaries.interfaces.js'
import type { PackageBinaryWrapper }          from './package-binaries.interfaces.js'

import { scriptUtils }                        from '@yarnpkg/core'
import { structUtils }                        from '@yarnpkg/core'
import { npath }                              from '@yarnpkg/fslib'
import { ppath }                              from '@yarnpkg/fslib'
import { xfs }                                from '@yarnpkg/fslib'

const quoteCommandArgument = (value: string): string => `"${value.replaceAll('"', '""')}"`

const quoteShellArgument = (value: string): string => `'${value.replaceAll("'", `'"'"'`)}'`

const writeBinaryWrapper = async (
  binFolder: InstallPackageBinariesOptions['binFolder'],
  name: string,
  executable: string,
  args: ReadonlyArray<string>
): Promise<void> => {
  if (process.platform === 'win32') {
    const command = [quoteCommandArgument(executable), ...args.map(quoteCommandArgument)].join(' ')
    const wrapper = `@goto #_undefined_# 2>NUL || @title %COMSPEC% & @setlocal & @${command} %*`

    await xfs.writeFilePromise(ppath.join(binFolder, `${name}.cmd` as Filename), wrapper)
  }

  const command = [executable, ...args].map(quoteShellArgument).join(' ')

  await xfs.writeFilePromise(
    ppath.join(binFolder, name as Filename),
    `#!/bin/sh\nexec ${command} "$@"\n`,
    { mode: 0o755 }
  )
}

export const installPackageBinaries = async ({
  binFolder,
  locator,
  pnpApi,
  project,
}: InstallPackageBinariesOptions): Promise<void> => {
  const pkg = project.storedPackages.get(locator.locatorHash)

  if (!pkg) {
    throw new Error(
      `Package ${structUtils.stringifyLocator(locator)} is missing from project state`
    )
  }

  const visibleLocators = [
    locator.locatorHash,
    ...Array.from(pkg.dependencies.values(), (descriptor) => {
      const resolution = project.storedResolutions.get(descriptor.descriptorHash)

      if (!resolution) {
        throw new Error(
          `Resolution for ${structUtils.stringifyDescriptor(descriptor)} is missing from project state`
        )
      }

      return resolution
    }),
  ]
  const wrappers = new Map<string, PackageBinaryWrapper>()

  for (const locatorHash of visibleLocators) {
    const dependency = project.storedPackages.get(locatorHash)

    if (!dependency || dependency.bin.size === 0) {
      continue
    }

    const packageInformation = pnpApi.getPackageInformation({
      name: structUtils.stringifyIdent(dependency),
      reference: dependency.reference,
    })

    if (!packageInformation) {
      continue
    }

    const packageLocation = npath.toPortablePath(packageInformation.packageLocation)

    for (const [name, target] of dependency.bin) {
      const binaryPath = ppath.resolve(packageLocation, target)
      const isScript = scriptUtils.isNodeScript(binaryPath)

      wrappers.set(name, {
        arguments: isScript ? [npath.fromPortablePath(binaryPath)] : [],
        executable: isScript ? process.execPath : npath.fromPortablePath(binaryPath),
        name,
      })
    }
  }

  await Promise.all(
    Array.from(wrappers.values(), async (wrapper) => {
      await writeBinaryWrapper(binFolder, wrapper.name, wrapper.executable, wrapper.arguments)
    })
  )
}
