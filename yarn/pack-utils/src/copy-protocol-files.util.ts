import { Descriptor }   from '@yarnpkg/core'
import { Locator }      from '@yarnpkg/core'
import { Project }      from '@yarnpkg/core'
import { Report }       from '@yarnpkg/core'
import { structUtils }  from '@yarnpkg/core'
import { PortablePath } from '@yarnpkg/fslib'
import { xfs }          from '@yarnpkg/fslib'
import { ppath }        from '@yarnpkg/fslib'

// https://github.com/yarnpkg/berry/blob/d38d573/packages/plugin-patch/sources/patchUtils.ts#L10
const BUILTIN_REGEXP = /^builtin<([^>]+)>$/

export const copyProtocolFiles = async (
  project: Project,
  destination: PortablePath,
  report: Report,
  parseDescriptor: (
    descriptor: Descriptor
  ) => { parentLocator: Locator; paths: PortablePath[] } | undefined
): Promise<void> => {
  const copiedPaths = new Set<string>()

  // eslint-disable-next-line no-restricted-syntax
  for (const descriptor of project.storedDescriptors.values()) {
    const resolvedDescriptor = structUtils.isVirtualDescriptor(descriptor)
      ? structUtils.devirtualizeDescriptor(descriptor)
      : descriptor

    const parsed = parseDescriptor(resolvedDescriptor)

    // eslint-disable-next-line no-continue
    if (!parsed) continue

    const { parentLocator, paths } = parsed

    // eslint-disable-next-line no-restricted-syntax
    for (const path of paths) {
      // eslint-disable-next-line no-continue
      if (BUILTIN_REGEXP.test(path)) continue

      // eslint-disable-next-line no-continue
      if (ppath.isAbsolute(path)) continue

      const parentWorkspace = project.getWorkspaceByLocator(parentLocator)

      const relativePath = ppath.join(parentWorkspace.relativeCwd, path)

      // eslint-disable-next-line no-continue
      if (copiedPaths.has(relativePath)) continue

      copiedPaths.add(relativePath)

      const src = ppath.join(parentWorkspace.cwd, path)
      const dest = ppath.join(destination, relativePath)

      report.reportInfo(null, relativePath)

      // eslint-disable-next-line no-await-in-loop
      await xfs.mkdirpPromise(ppath.dirname(dest))

      // eslint-disable-next-line no-await-in-loop
      await xfs.copyFilePromise(src, dest)
    }
  }
}
