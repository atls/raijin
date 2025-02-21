/* eslint-disable no-console */

import type { StreamReport }        from '@yarnpkg/core'

import { runSchematicHelper }       from '../helpers/index.js'
import { writeTmpSchematicHelper }  from '../helpers/index.js'
import { removeTmpSchematicHelper } from '../helpers/index.js'

type StreamReportCallbackType = Parameters<typeof StreamReport.start>[1]

export const getStreamReportCallback = async (
  options: Record<string, string>
): Promise<StreamReportCallbackType> => {
  const streamReportCallback = async (report: StreamReport): Promise<void> => {
    try {
      await writeTmpSchematicHelper()
      await runSchematicHelper('project', options)
    } catch (error) {
      console.error(error)
    } finally {
      await removeTmpSchematicHelper()
    }
  }

  return streamReportCallback
}
