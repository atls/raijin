import type { Workspace }                  from '@yarnpkg/core'

import type { EligibleWorkspaceReference } from './interfaces/eligibility.js'
import type { WorkspaceEligibilityResult } from './interfaces/eligibility.js'

import { structUtils }                     from '@yarnpkg/core'

const ALLOWED_BUILD_COMMANDS = [
  'actl service build',
  'actl renderer build',
  'build-storybook',
  'storybook build',
  'next build',
  'builder build library',
  'app service build',
  'app renderer build',
  'service build',
  'renderer build',
  'strapi build',
  'astro build',
]

export const NO_ELIGIBLE_IMAGE_WORKSPACES_DIAGNOSTIC =
  'No selected workspaces are eligible for image publication.'

export const isWorkspaceEligibleForImage = (workspace: Workspace): boolean => {
  const { name, scripts } = workspace.manifest
  const buildCommand = scripts.get('build')

  return (
    Boolean(name) &&
    ALLOWED_BUILD_COMMANDS.some((allowedCommand) => buildCommand?.includes(allowedCommand))
  )
}

export const resolveWorkspaceEligibility = (
  selectedWorkspaces: Iterable<Workspace>
): WorkspaceEligibilityResult | undefined => {
  const eligibleWorkspaces: Array<EligibleWorkspaceReference> = []

  for (const workspace of selectedWorkspaces) {
    if (!isWorkspaceEligibleForImage(workspace) || !workspace.manifest.name) {
      continue
    }

    eligibleWorkspaces.push({
      location: workspace.relativeCwd,
      name: structUtils.stringifyIdent(workspace.manifest.name),
    })
  }

  const firstWorkspace = eligibleWorkspaces.shift()

  if (!firstWorkspace) {
    return undefined
  }

  return {
    eligibleWorkspaces: [firstWorkspace, ...eligibleWorkspaces],
  }
}
