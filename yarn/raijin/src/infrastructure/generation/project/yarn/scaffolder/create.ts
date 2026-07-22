import type { ScaffoldResult }            from '@atls/raijin/application/generation'
import type { Scaffolder }                from '@atls/raijin/application/generation'

import type { YarnContext }               from '../collection/package.interfaces.js'

import { CollectionUnavailableException } from '../collection/package.js'
import { scaffoldWithAngular }            from '../../angular/scaffold/execute.js'
import { withYarnCollection }             from '../collection/package.js'

export const createYarnScaffolder = (context: YarnContext): Scaffolder => ({
  generate: async (input): Promise<ScaffoldResult> => {
    try {
      return await withYarnCollection(context, async (collectionPath) =>
        scaffoldWithAngular(collectionPath, input))
    } catch (error) {
      if (!(error instanceof CollectionUnavailableException)) {
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
