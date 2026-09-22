import type { TypecheckManifestPolicySource } from '@atls/yarn-plugin-typescript'
import type { Project }                       from '@yarnpkg/core'
import type { Workspace }                     from '@yarnpkg/core'

import type { TargetGroup }                   from '../targets/selection.js'

import { dirname }                            from 'node:path'

import { toNativeCwd }                        from '@atls/raijin/commands'
import { toNativePath }                       from '@atls/raijin/filesystem'
import { toPortablePath }                     from '@atls/raijin/filesystem'
import { resolveTypecheckProjectConfig }      from '@atls/yarn-plugin-typescript'

type TypecheckScopeFields = {
  readonly cwd: string
  readonly manifestPolicySources: ReadonlyArray<TypecheckManifestPolicySource>
}

export type TypecheckScope =

    | (TypecheckScopeFields & { readonly kind: 'files'; readonly files: ReadonlyArray<string> })
    | (TypecheckScopeFields & { readonly kind: 'project' })

export const getTypecheckManifestSources = (
  project: Project,
  workspace: Workspace
): ReadonlyArray<TypecheckManifestPolicySource> =>
  [project.topLevelWorkspace, workspace].map(({ cwd, manifest }) => ({
    cwd: toNativeCwd(cwd),
    ...(Object.hasOwn(manifest.raw, 'typecheckSkipLibCheck')
      ? { typecheckSkipLibCheck: manifest.raw.typecheckSkipLibCheck }
      : {}),
  }))

export const resolveProjectTypecheckScopes = async (
  project: Project
): Promise<ReadonlyArray<TypecheckScope>> => {
  const projectCwd = toNativeCwd(project.cwd)
  const seen = new Set<string>()
  const scopes: Array<TypecheckScope> = []

  for await (const workspace of project.workspaces) {
    const config = await resolveTypecheckProjectConfig(toNativeCwd(workspace.cwd), projectCwd)

    if (!config || seen.has(config)) {
      continue
    }

    seen.add(config)

    const owner =
      project.tryWorkspaceByFilePath(toPortablePath(config)) ?? project.topLevelWorkspace

    scopes.push({
      kind: 'project',
      cwd: toNativeCwd(owner.cwd),
      manifestPolicySources: getTypecheckManifestSources(project, owner),
    })
  }

  return scopes.length > 0
    ? scopes
    : [
        {
          kind: 'project',
          cwd: projectCwd,
          manifestPolicySources: [{ cwd: projectCwd }],
        },
      ]
}

export const resolveTargetTypecheckScopes = async (
  project: Project,
  group: TargetGroup
): Promise<ReadonlyArray<TypecheckScope>> => {
  const projectCwd = toNativeCwd(project.cwd)
  const sources = getTypecheckManifestSources(project, group.workspace)
  const seenProjects = new Set<string>()
  const scopes: Array<TypecheckScope> = []

  for await (const target of group.directories.targets) {
    const cwd = toNativePath(target.path)
    const config = await resolveTypecheckProjectConfig(cwd, projectCwd)
    const identity = config ?? cwd

    if (!seenProjects.has(identity)) {
      seenProjects.add(identity)
      scopes.push({ kind: 'project', cwd, manifestPolicySources: sources })
    }
  }

  const fileGroups = new Map<
    string,
    {
      cwd: string
      files: Array<string>
    }
  >()

  for await (const target of group.files.targets) {
    const file = toNativePath(target.path)
    const cwd = dirname(file)
    const config = await resolveTypecheckProjectConfig(cwd, projectCwd)
    const identity = config ?? cwd

    if (seenProjects.has(identity)) {
      continue
    }

    const files = fileGroups.get(identity) ?? { cwd, files: [] }

    files.files.push(file)
    fileGroups.set(identity, files)
  }

  scopes.push(
    ...[...fileGroups.values()].map(({ cwd, files }) => ({
      kind: 'files' as const,
      cwd,
      files,
      manifestPolicySources: sources,
    }))
  )

  return scopes
}
