export const RELEASE_PLAN_SCHEMA_VERSION = 1

export const RELEASE_VERSION_STATE_OWNER = 'yarn'

export const RELEASE_VERSION_STATE_SOURCE = 'yarn-deferred-version-files'

export const RELEASE_RECORD_OWNER = 'github-releases'

export const RELEASE_REGISTRY_STATE_OWNER = 'package-registries'

export const RELEASE_ORCHESTRATION_OWNER = 'raijin'

export const RELEASE_OWNERSHIP_CONTRACT = {
  versionState: {
    owner: RELEASE_VERSION_STATE_OWNER,
    source: RELEASE_VERSION_STATE_SOURCE,
  },
  releaseRecords: {
    owner: RELEASE_RECORD_OWNER,
  },
  registryState: {
    owner: RELEASE_REGISTRY_STATE_OWNER,
  },
  orchestration: {
    owner: RELEASE_ORCHESTRATION_OWNER,
  },
} as const

export type ReleaseOwnershipContract = typeof RELEASE_OWNERSHIP_CONTRACT

export type ReleasePlanDecision = 'decline' | 'release'

export const isReleasePlanDecision = (decision: unknown): decision is ReleasePlanDecision =>
  decision === 'release' || decision === 'decline'

export const isReleaseOwnershipContract = (
  contract: unknown
): contract is ReleaseOwnershipContract => {
  if (typeof contract !== 'object' || contract === null) {
    return false
  }

  const item = contract as {
    versionState?: {
      owner?: unknown
      source?: unknown
    }
    releaseRecords?: {
      owner?: unknown
    }
    registryState?: {
      owner?: unknown
    }
    orchestration?: {
      owner?: unknown
    }
  }

  return (
    item.versionState?.owner === RELEASE_VERSION_STATE_OWNER &&
    item.versionState.source === RELEASE_VERSION_STATE_SOURCE &&
    item.releaseRecords?.owner === RELEASE_RECORD_OWNER &&
    item.registryState?.owner === RELEASE_REGISTRY_STATE_OWNER &&
    item.orchestration?.owner === RELEASE_ORCHESTRATION_OWNER
  )
}
