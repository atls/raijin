import type { ResolveChangedProjectStateInput } from './interfaces/input.js'
import type { ResolveChangedProjectStateEntrypointInput } from './interfaces/input.js'
import type { ChangedProjectStateResult } from './interfaces/result.js'
import type { ChangedProjectStateResolutionResult } from './interfaces/result.js'

import { readGitHubActionsEvent }          from './event.js'
import { resolveGitChangedFiles }          from './git.js'
import { createPullRequestFilesProvider }  from './github.js'
import { resolvePullRequestChangedFiles }  from './github.js'
import { selectChangedStateSource }        from './select-source.js'
import { resolveChangedWorkspaces }        from './workspaces.js'

export const resolveChangedProjectState = async (
  input: ResolveChangedProjectStateInput
): Promise<ChangedProjectStateResolutionResult> => {
  let files

  if (input.kind === 'pull-request') {
    const result = await resolvePullRequestChangedFiles(input.source, input.provider)

    if (result.kind === 'error') {
      return result
    }

    files = result.files
  } else {
    const result = await resolveGitChangedFiles(input.processInvocation, input.source)

    if (result.kind === 'error') {
      return result
    }

    files = result.files
  }

  return {
    kind: 'completed',
    state: {
      files,
      workspaces: resolveChangedWorkspaces(input.project, files),
    },
  }
}

export const resolveChangedProjectStateForEntrypoint = async ({
  processInvocation,
  project,
  readEvent = readGitHubActionsEvent,
  since,
}: ResolveChangedProjectStateEntrypointInput): Promise<ChangedProjectStateResult> => {
  const selection = selectChangedStateSource(since, since === undefined ? readEvent() : undefined)

  if (selection.kind === 'error') {
    return selection
  }

  if (selection.source.kind === 'pull-request') {
    const providerResult = createPullRequestFilesProvider(selection.source)

    if (providerResult.kind === 'error') {
      return providerResult
    }

    return resolveChangedProjectState({
      kind: 'pull-request',
      processInvocation,
      project,
      provider: providerResult.provider,
      source: selection.source,
    })
  }

  return resolveChangedProjectState({
    kind: 'git',
    processInvocation,
    project,
    source: selection.source,
  })
}
