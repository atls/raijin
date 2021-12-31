import { Workspace } from '@yarnpkg/core'
import { Project }   from '@yarnpkg/core'

export const clearUnusedWorkspaces = (
  project: Project,
  workspaces: Set<Workspace>,
  production: boolean = false
): void => {
  for (const ws of project.workspaces) {
    if (workspaces.has(ws)) {
      if (production) {
        ws.manifest.devDependencies.clear()
      }
    } else {
      ws.manifest.dependencies.clear()
      ws.manifest.devDependencies.clear()
      ws.manifest.peerDependencies.clear()
    }
  }
}
