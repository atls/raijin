import type { ProjectGenerationResult }          from '@atls/raijin/application/generation'
import type { ProjectScaffolder }                from '@atls/raijin/application/generation'

import type { YarnProjectCollectionContext }     from './collection.js'

import { ProjectCollectionUnavailableException } from './collection.js'
import { scaffoldProjectWithAngular }            from '../angular/scaffold.js'
import { withYarnProjectCollection }             from './collection.js'

export const createYarnProjectScaffolder = (
  context: YarnProjectCollectionContext
): ProjectScaffolder => ({
  generate: async (input): Promise<ProjectGenerationResult> => {
    try {
      return await withYarnProjectCollection(context, async (collectionPath) =>
        scaffoldProjectWithAngular(collectionPath, input))
    } catch (error) {
      if (!(error instanceof ProjectCollectionUnavailableException)) {
        throw error
      }

      return {
        status: 'failed',
        changes: [],
        diagnostics: [],
        failure: {
          code: 'project-collection-unavailable',
          message: error.message,
        },
      }
    }
  },
})
