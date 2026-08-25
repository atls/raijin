export { plugin as default } from './files.plugin.js'

export { formatChangedStateManagedError } from './changed-state/message.js'
export { readGitHubActionsEvent }          from './changed-state/event.js'
export { resolveChangedProjectStateForEntrypoint } from './changed-state/resolve.js'
export { resolveProjectWorkspaces } from './changed-state/workspaces.js'
export { toWorkspaceIdentity }      from './changed-state/workspaces.js'

export type { ChangedProjectState } from './changed-state/interfaces/result.js'
export type { ChangedStateManagedError } from './changed-state/interfaces/result.js'
export type { ChangedWorkspaceIdentity } from './changed-state/interfaces/result.js'
