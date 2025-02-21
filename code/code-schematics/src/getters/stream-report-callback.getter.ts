/* eslint-disable no-console */

import type { StreamReport }       from '@yarnpkg/core'

import { ppath }                   from '@yarnpkg/fslib'
import { xfs }                     from '@yarnpkg/fslib'

import { runSchematicHelper }      from '../helpers/index.js'
import { writeTmpSchematicHelper } from '../helpers/index.js'
import { prepareTmpDir }           from '../helpers/index.js'

type StreamReportCallbackType = Parameters<typeof StreamReport.start>[1]

export const getStreamReportCallback = async (
  options: Record<string, string>
): Promise<StreamReportCallbackType> => {
  const streamReportCallback = async (report: StreamReport): Promise<void> => {
    try {
      const tmpDir = await xfs.mktempPromise()
      const collectionPath = ppath.join(tmpDir, 'collection.json')

      await writeTmpSchematicHelper(tmpDir)
      await prepareTmpDir(tmpDir)
      await runSchematicHelper('project', options, collectionPath)
    } catch (error) {
      console.error(error)
    }
  }

  return streamReportCallback
}
