import type { ProjectGenerationResult }      from '@atls/raijin/application/generation'
import type { ProjectScaffolder }            from '@atls/raijin/application/generation'

import type { YarnProjectCollectionContext } from './yarn-project-collection.interfaces.js'

import { ProjectCollectionUnavailableException } from './project-collection-unavailable.exception.js'
import { runProjectSchematic }               from './project-schematic-runner.js'
import { withYarnProjectCollection }         from './yarn-project-collection.js'

export const createYarnProjectScaffolder = (
  context: YarnProjectCollectionContext
): ProjectScaffolder => ({
  generate: async (input): Promise<ProjectGenerationResult> => {
    try {
      return await withYarnProjectCollection(context, async (collectionPath) =>
        runProjectSchematic(collectionPath, input))
    } catch (error) {
      if (!(error instanceof ProjectCollectionUnavailableException)) {
        throw error
      }

      return {
        status: 'failed',
        artifacts: [],
        diagnostics: [],
        failure: {
          code: 'project-collection-unavailable',
          message: error.message,
        },
      }
    }
  },
})
