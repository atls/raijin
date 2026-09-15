import type { Project }   from '@yarnpkg/core'
import type { Workspace } from '@yarnpkg/core'

interface ChecksReleaseRawConfig {
  enabled?: unknown
  privateWorkspaces?: unknown
}

interface ChecksRawConfig {
  release?: unknown
}

interface ToolsRawConfig {
  checks?: unknown
}

export interface ChecksReleaseConfig {
  enabled: boolean
  privateWorkspaces: boolean
}

export const DEFAULT_CHECKS_RELEASE_CONFIG: ChecksReleaseConfig = {
  enabled: true,
  privateWorkspaces: true,
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const resolveChecksReleaseConfig = (project: Project): ChecksReleaseConfig => {
  const tools = project.topLevelWorkspace.manifest.raw.tools as ToolsRawConfig | undefined

  if (!isObject(tools?.checks)) {
    return DEFAULT_CHECKS_RELEASE_CONFIG
  }

  const { release } = tools.checks as ChecksRawConfig

  if (release === false) {
    return {
      ...DEFAULT_CHECKS_RELEASE_CONFIG,
      enabled: false,
    }
  }

  if (!isObject(release)) {
    return DEFAULT_CHECKS_RELEASE_CONFIG
  }

  const config = release as ChecksReleaseRawConfig

  return {
    enabled: config.enabled === false ? false : DEFAULT_CHECKS_RELEASE_CONFIG.enabled,
    privateWorkspaces:
      config.privateWorkspaces === false ? false : DEFAULT_CHECKS_RELEASE_CONFIG.privateWorkspaces,
  }
}

export const isReleaseWorkspaceAllowed = (
  workspace: Workspace,
  config: ChecksReleaseConfig
): boolean => config.privateWorkspaces || !workspace.manifest.private
