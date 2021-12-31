import { Workspace } from '@yarnpkg/core'
import { Project }   from '@yarnpkg/core'
import { Manifest }  from '@yarnpkg/core'

export const getRequiredWorkspaces = (
  project: Project,
  workspaces: Workspace[],
  production: boolean = false,
  scopes: string[] = production ? ['dependencies'] : Manifest.hardDependencies
): Set<Workspace> => {
  const requiredWorkspaces = new Set([...workspaces])

  for (const ws of requiredWorkspaces) {
    for (const scope of scopes) {
      const deps = ws.manifest.getForScope(scope).values()

      for (const dep of deps) {
        const workspace = project.tryWorkspaceByDescriptor(dep)

        if (workspace) {
          requiredWorkspaces.add(workspace)
        }
      }
    }
  }

  return requiredWorkspaces
}
