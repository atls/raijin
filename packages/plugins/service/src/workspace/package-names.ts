import type { Workspace } from '@yarnpkg/core'

import { Manifest }       from '@yarnpkg/core'
import { structUtils }    from '@yarnpkg/core'

const WORKSPACE_DEPENDENCY_TYPES = [...Manifest.hardDependencies, 'peerDependencies']

export const getWorkspacePackageNames = (workspace: Workspace): Array<string> => {
  const dependencies = new Set<Workspace>()

  const addWorkspaceDependency = ({ manifest, project }: Workspace): void => {
    for (const dependencyType of WORKSPACE_DEPENDENCY_TYPES) {
      for (const descriptor of manifest.getForScope(dependencyType).values()) {
        const dependency = project.tryWorkspaceByDescriptor(descriptor)

        if (dependency && !dependencies.has(dependency)) {
          dependencies.add(dependency)
          addWorkspaceDependency(dependency)
        }
      }
    }
  }

  addWorkspaceDependency(workspace)

  return [...dependencies].flatMap((dependency) =>
    dependency.manifest.name ? [structUtils.stringifyIdent(dependency.manifest.name)] : [])
}
