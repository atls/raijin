export type ReleaseVersionStrategy = 'major' | 'minor' | 'patch'

export interface ReleaseVersionWorkspace {
  ident: string
  relativeCwd: string
}

export interface ReleaseVersionChange {
  message: string
  files: Array<string>
}

export interface ReleaseVersionWorkspaceStrategy {
  workspace: ReleaseVersionWorkspace
  strategy: ReleaseVersionStrategy
}

const FEATURE_COMMIT_TYPE = 'feat'
const HEADER_SEPARATOR = ': '
const SCOPE_START = '('
const SCOPE_END = ')'
const BREAKING_MARKER = '!'
const ROOT_WORKSPACE_CWD = '.'
const BREAKING_CHANGE_PREFIXES = [
  'BREAKING CHANGE:',
  'BREAKING CHANGE ',
  'BREAKING-CHANGE:',
  'BREAKING-CHANGE ',
]

const STRATEGY_WEIGHT: Record<ReleaseVersionStrategy, number> = {
  patch: 0,
  minor: 1,
  major: 2,
}

const compareStrategies = (
  current: ReleaseVersionStrategy,
  next: ReleaseVersionStrategy
): ReleaseVersionStrategy => (STRATEGY_WEIGHT[next] > STRATEGY_WEIGHT[current] ? next : current)

const isRootWorkspace = (workspace: ReleaseVersionWorkspace): boolean =>
  workspace.relativeCwd === ROOT_WORKSPACE_CWD

const isNestedWorkspaceFile = (file: string, workspace: ReleaseVersionWorkspace): boolean =>
  file === workspace.relativeCwd || file.startsWith(`${workspace.relativeCwd}/`)

const isClaimedByNestedWorkspace = (
  file: string,
  workspaces: ReadonlyArray<ReleaseVersionWorkspace>
): boolean =>
  workspaces.some(
    (workspace) => !isRootWorkspace(workspace) && isNestedWorkspaceFile(file, workspace)
  )

const isWorkspaceFile = (
  file: string,
  workspace: ReleaseVersionWorkspace,
  workspaces: ReadonlyArray<ReleaseVersionWorkspace>
): boolean => {
  if (isRootWorkspace(workspace)) {
    return !isClaimedByNestedWorkspace(file, workspaces)
  }

  return isNestedWorkspaceFile(file, workspace)
}

const isConventionalType = (type: string): boolean =>
  type.length > 0 && [...type].every((char) => char >= 'a' && char <= 'z')

const hasBreakingChangeFooter = (message: string): boolean =>
  message
    .split('\n')
    .map((line) => line.replace('\r', ''))
    .some((line) => BREAKING_CHANGE_PREFIXES.some((prefix) => line.startsWith(prefix)))

const parseCommitHeader = (header: string): { type: string; breaking: boolean } | undefined => {
  const separatorIndex = header.indexOf(HEADER_SEPARATOR)

  if (separatorIndex < 1) {
    return undefined
  }

  let descriptor = header.slice(0, separatorIndex)
  const breaking = descriptor.endsWith(BREAKING_MARKER)

  if (breaking) {
    descriptor = descriptor.slice(0, -BREAKING_MARKER.length)
  }

  const scopeStartIndex = descriptor.indexOf(SCOPE_START)

  if (scopeStartIndex >= 0) {
    if (!descriptor.endsWith(SCOPE_END)) {
      return undefined
    }

    descriptor = descriptor.slice(0, scopeStartIndex)
  }

  if (!isConventionalType(descriptor)) {
    return undefined
  }

  return {
    type: descriptor,
    breaking,
  }
}

export const resolveReleaseVersionStrategy = (
  message: string
): ReleaseVersionStrategy | undefined => {
  const [header = ''] = message.split('\n', 1)
  const parsed = parseCommitHeader(header.replace('\r', ''))

  if (!parsed) {
    return undefined
  }

  if (parsed.breaking || hasBreakingChangeFooter(message)) {
    return 'major'
  }

  if (parsed.type === FEATURE_COMMIT_TYPE) {
    return 'minor'
  }

  return 'patch'
}

export const resolveReleaseVersionWorkspaceStrategies = (
  workspaces: ReadonlyArray<ReleaseVersionWorkspace>,
  changes: ReadonlyArray<ReleaseVersionChange>
): Array<ReleaseVersionWorkspaceStrategy> => {
  const strategies = new Map<string, ReleaseVersionWorkspaceStrategy>()

  for (const change of changes) {
    const strategy = resolveReleaseVersionStrategy(change.message)

    if (!strategy) {
      continue
    }

    for (const workspace of workspaces) {
      if (!change.files.some((file) => isWorkspaceFile(file, workspace, workspaces))) {
        continue
      }

      const current = strategies.get(workspace.ident)

      strategies.set(workspace.ident, {
        workspace,
        strategy: current ? compareStrategies(current.strategy, strategy) : strategy,
      })
    }
  }

  return [...strategies.values()].sort((left, right) =>
    left.workspace.relativeCwd.localeCompare(right.workspace.relativeCwd))
}
