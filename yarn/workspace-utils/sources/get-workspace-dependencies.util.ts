import type { Workspace } from '@yarnpkg/core'

import { Manifest }       from '@yarnpkg/core'

export const getWorkspaceDependencies = (workspace: Workspace): ReadonlyArray<Workspace> => {
  const { project } = workspace
  const dependencies = new Set<Workspace>()

  const addWorkspaceDependency = ({ manifest }: Workspace): void => {
    for (const depType of Manifest.hardDependencies) {
      for (const descriptor of manifest.getForScope(depType).values()) {
        const dependency = project.tryWorkspaceByDescriptor(descriptor)

        if (dependency && !dependencies.has(dependency)) {
          dependencies.add(dependency)

          addWorkspaceDependency(dependency)
        }
      }
    }
  }

  addWorkspaceDependency(workspace)

  return [...dependencies]
}
