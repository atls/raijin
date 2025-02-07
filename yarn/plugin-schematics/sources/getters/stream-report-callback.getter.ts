import '@atls/schematics'

import type { StreamReport }  from '@yarnpkg/core'

import { runSchematicHelper } from '../helpers/run-schematics.helper.js'

type StreamReportCallbackType = Parameters<typeof StreamReport.start>[1]

export const getStreamReportCallback = (options: object): StreamReportCallbackType => {
  const streamReportCallback = async (report: StreamReport): Promise<void> => {
    try {
      await runSchematicHelper('project', options)
    } catch (error) {
      console.error(error)
    }
  }

  return streamReportCallback
}
