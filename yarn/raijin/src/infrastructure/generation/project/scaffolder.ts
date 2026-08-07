import type { Configuration }             from '@yarnpkg/core'
import type { Project }                   from '@yarnpkg/core'
import type { PortablePath }              from '@yarnpkg/fslib'

import type { ProjectScaffolder }         from '../../../application/generation/project/index.js'

import { npath }                          from '@yarnpkg/fslib'

import { scaffoldProjectWithAngular }     from './angular/scaffold.js'
import { createGeneratedWorkflowPolicy }  from './github/generated-workflow-policy.js'
import { withInstalledProjectCollection } from './yarn/collection.js'

const failureMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

export const createInstalledProjectScaffolder = ({
  configuration,
  project,
  targetCwd,
}: {
  configuration: Configuration
  project: Project
  targetCwd: PortablePath
}): ProjectScaffolder => ({
  scaffold: async (scaffoldType) => {
    try {
      return await withInstalledProjectCollection({ configuration, project }, async ({
        collectionPath,
        manifest,
      }) =>
        scaffoldProjectWithAngular({
          collectionPath,
          policy: createGeneratedWorkflowPolicy(manifest),
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
