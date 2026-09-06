import type { Configuration }         from '@yarnpkg/core'
import type { Project }               from '@yarnpkg/core'
import type { Workspace }             from '@yarnpkg/core'
import type { PortablePath }          from '@yarnpkg/fslib'

import type { ProjectScaffolder }     from '../../../application/generation/project/index.js'

import { npath }                      from '@yarnpkg/fslib'

import { scaffoldProjectWithAngular } from './angular/scaffold.js'
import { withCollection }             from './yarn/collection/package.js'

const failureMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

export const createInstalledProjectScaffolder = ({
  configuration,
  project,
  targetCwd,
  workspace,
}: {
  configuration: Configuration
  project: Project
  targetCwd: PortablePath
  workspace: Workspace
}): ProjectScaffolder => ({
  scaffold: async (scaffoldType) => {
    try {
      return await withCollection({ configuration, project, workspace }, async ({
        collectionPath,
      }) =>
        scaffoldProjectWithAngular({
          collectionPath,
          scaffoldType,
          targetPath: npath.fromPortablePath(targetCwd),
        }))
    } catch (error) {
      return {
        status: 'failed',
        changes: [],
        failure: {
          code: 'project-scaffolding-failed',
          message: `Project scaffolding failed: ${failureMessage(error)}`,
        },
      }
    }
  },
})
