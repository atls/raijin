import type { TypecheckManifestPolicySource } from '@atls/yarn-plugin-typescript'
import type { Project }                       from '@yarnpkg/core'

import { toNativeCwd }                        from '@atls/raijin/commands'
import { toPortablePath }                     from '@atls/raijin/filesystem'
import { resolveTypecheckProjectConfig }      from '@atls/yarn-plugin-typescript'

export type TypecheckScope = {
  readonly cwd: string
  readonly manifestPolicySources: ReadonlyArray<TypecheckManifestPolicySource>
}

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
      cwd: toNativeCwd(owner.cwd),
      manifestPolicySources: [project.topLevelWorkspace, owner].map(({ cwd, manifest }) => ({
        cwd: toNativeCwd(cwd),
        ...(Object.hasOwn(manifest.raw, 'typecheckSkipLibCheck')
          ? { typecheckSkipLibCheck: manifest.raw.typecheckSkipLibCheck }
          : {}),
      })),
    })
  }

  return scopes.length > 0
    ? scopes
    : [
        {
          cwd: projectCwd,
          manifestPolicySources: [{ cwd: projectCwd }],
        },
      ]
}
