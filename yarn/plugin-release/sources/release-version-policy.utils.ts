export type ReleaseVersionStrategy = 'major' | 'minor' | 'patch'

export interface ReleaseVersionWorkspace {
  ident: string
  relativeCwd: string
}

export interface ReleaseVersionWorkspaceOwner {
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
const COMMIT_FOOTER_PATTERN = /^(?:[A-Za-z0-9-]+|BREAKING CHANGE)(?:: | #).+/

const STRATEGY_WEIGHT: Record<ReleaseVersionStrategy, number> = {
  patch: 0,
  minor: 1,
  major: 2,
}
const DEFAULT_RELEASE_VERSION_STRATEGY: ReleaseVersionStrategy = 'patch'

export const isReleaseVersionStrategy = (strategy: string): strategy is ReleaseVersionStrategy =>
  Object.hasOwn(STRATEGY_WEIGHT, strategy)

const compareStrategies = (
  current: ReleaseVersionStrategy,
  next: ReleaseVersionStrategy
): ReleaseVersionStrategy => (STRATEGY_WEIGHT[next] > STRATEGY_WEIGHT[current] ? next : current)

export const resolveReleaseVersionDeferredStrategy = (
  current: string | undefined,
  next: ReleaseVersionStrategy
): string => {
  if (current === undefined) {
    return next
  }

  if (!isReleaseVersionStrategy(current)) {
    return current
  }

  return compareStrategies(current, next)
}

export const mergeReleaseVersionDeferredDecision = (
  current: string | undefined,
  next: string
): string => {
  if (current === undefined) {
    return next
  }

  if (!isReleaseVersionStrategy(current)) {
    return current
  }

  if (!isReleaseVersionStrategy(next)) {
    return next
  }

  return resolveReleaseVersionDeferredStrategy(current, next)
}

const isRootWorkspace = (workspace: ReleaseVersionWorkspaceOwner): boolean =>
  workspace.relativeCwd === ROOT_WORKSPACE_CWD

const isNestedWorkspaceFile = (file: string, workspace: ReleaseVersionWorkspaceOwner): boolean =>
  file === workspace.relativeCwd || file.startsWith(`${workspace.relativeCwd}/`)

const isWorkspaceOwner = (
  workspace: ReleaseVersionWorkspaceOwner,
  owner: ReleaseVersionWorkspaceOwner
): boolean => workspace.relativeCwd === owner.relativeCwd

const isNestedWorkspaceOwner = (
  workspace: ReleaseVersionWorkspaceOwner,
  owner: ReleaseVersionWorkspaceOwner
): boolean => {
  if (isWorkspaceOwner(workspace, owner)) {
    return false
  }

  if (isRootWorkspace(workspace)) {
    return !isRootWorkspace(owner)
  }

  return owner.relativeCwd.startsWith(`${workspace.relativeCwd}/`)
}

const isClaimedByNestedWorkspace = (
  file: string,
  workspace: ReleaseVersionWorkspaceOwner,
  workspaceOwners: ReadonlyArray<ReleaseVersionWorkspaceOwner>
): boolean =>
  workspaceOwners.some(
    (owner) => isNestedWorkspaceOwner(workspace, owner) && isNestedWorkspaceFile(file, owner)
  )

const isWorkspaceFile = (
  file: string,
  workspace: ReleaseVersionWorkspace,
  workspaceOwners: ReadonlyArray<ReleaseVersionWorkspaceOwner>
): boolean => {
  if (isRootWorkspace(workspace)) {
    return !isClaimedByNestedWorkspace(file, workspace, workspaceOwners)
  }

  return (
    isNestedWorkspaceFile(file, workspace) &&
    !isClaimedByNestedWorkspace(file, workspace, workspaceOwners)
  )
}

const isConventionalType = (type: string): boolean =>
  type.length > 0 && [...type].every((char) => char >= 'a' && char <= 'z')

const isBlankLine = (line: string): boolean => line.trim().length === 0

const isCommitFooterLine = (line: string): boolean => COMMIT_FOOTER_PATTERN.test(line)

const getCommitFooterLines = (message: string): Array<string> => {
  const lines = message.split('\n').map((line) => line.replace('\r', ''))

  while (lines.length > 0 && isBlankLine(lines[lines.length - 1])) {
    lines.pop()
  }

  let footerStart = lines.length

  while (footerStart > 0 && !isBlankLine(lines[footerStart - 1])) {
    footerStart -= 1
  }

  if (footerStart === 0 || footerStart === lines.length) {
    return []
  }

  const footerLines = lines.slice(footerStart)

  if (!isCommitFooterLine(footerLines[0])) {
    return []
  }

  return footerLines
}

const hasBreakingChangeFooter = (message: string): boolean =>
  getCommitFooterLines(message).some((line) =>
    BREAKING_CHANGE_PREFIXES.some((prefix) => line.startsWith(prefix)))

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
  changes: ReadonlyArray<ReleaseVersionChange>,
  workspaceOwners: ReadonlyArray<ReleaseVersionWorkspaceOwner> = workspaces
): Array<ReleaseVersionWorkspaceStrategy> => {
  const strategies = new Map<string, ReleaseVersionWorkspaceStrategy>()

  for (const change of changes) {
    const strategy =
      resolveReleaseVersionStrategy(change.message) ?? DEFAULT_RELEASE_VERSION_STRATEGY

    for (const workspace of workspaces) {
      if (!change.files.some((file) => isWorkspaceFile(file, workspace, workspaceOwners))) {
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
