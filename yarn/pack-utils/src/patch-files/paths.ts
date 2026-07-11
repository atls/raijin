import type { Descriptor }   from '@yarnpkg/core'
import type { Project }      from '@yarnpkg/core'
import type { Workspace }    from '@yarnpkg/core'
import type { PortablePath } from '@yarnpkg/fslib'

import { structUtils }       from '@yarnpkg/core'
import { ppath }             from '@yarnpkg/fslib'
import { patchUtils }        from '@yarnpkg/plugin-patch'

const BUILTIN_REGEXP = /^builtin<([^>]+)>$/

const getDescriptorPatchPaths = (descriptors: Iterable<Descriptor>): Array<PortablePath> => {
  const paths = new Array<PortablePath>()

  for (const descriptor of descriptors) {
    if (!patchUtils.isPatchDescriptor(descriptor)) continue

    const { patchPaths } = patchUtils.parseDescriptor(descriptor)

    for (const rawPath of patchPaths) {
      const flagIndex = rawPath.lastIndexOf('!')
      const path = (flagIndex === -1 ? rawPath : rawPath.slice(flagIndex + 1)) as PortablePath

      if (BUILTIN_REGEXP.test(path)) continue
      if (ppath.isAbsolute(path)) continue

      paths.push(path)
    }
  }

  return paths
}

export const getWorkspacePatchPaths = (workspace: Workspace): Array<PortablePath> =>
  getDescriptorPatchPaths([
    ...workspace.manifest.dependencies.values(),
    ...workspace.manifest.peerDependencies.values(),
  ])

export const getProjectResolutionPatchPaths = (project: Project): Array<PortablePath> =>
  getDescriptorPatchPaths(
    project.topLevelWorkspace.manifest.resolutions.map((resolution) => {
      const ident = structUtils.parseIdent(resolution.pattern.descriptor.fullName)

      return structUtils.makeDescriptor(ident, resolution.reference)
    })
  )

export const resolvePatchPath = (
  cwd: PortablePath,
  path: PortablePath,
  boundary: string
): { relativePath: PortablePath; src: PortablePath } => {
  const src = ppath.resolve(cwd, path)
  const relativePath = ppath.contains(cwd, src)

  if (relativePath === null) {
    throw new Error(`Patch path ${path} resolves outside the ${boundary}`)
  }

  return { relativePath, src }
}
