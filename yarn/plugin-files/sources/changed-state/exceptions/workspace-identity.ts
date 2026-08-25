import type { ChangedWorkspaceIdentity } from '../interfaces/result.js'

export class WorkspaceIdentityException extends Error {
  constructor(readonly identity: ChangedWorkspaceIdentity) {
    super(`Yarn project does not contain workspace "${identity.path}"`, { cause: identity })
    this.name = 'WorkspaceIdentityException'
  }
}
