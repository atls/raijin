/* eslint-disable no-console */

import '@atls/schematics'

import type { StreamReport }       from '@yarnpkg/core'

import { PackageNotProvidedError } from '../errors/index.js'

type StreamReportCallbackType = Parameters<typeof StreamReport.start>[1]

export const getStreamReportCallback = async (
  options: Record<string, string>
): Promise<StreamReportCallbackType> => {
  const atlsSchematics = await import('@atls/schematics')

  if (!atlsSchematics) {
    throw new PackageNotProvidedError()
  }

  const { runSchematicHelper } = atlsSchematics

  const streamReportCallback = async (report: StreamReport): Promise<void> => {
    try {
      await runSchematicHelper('project', options)
    } catch (error) {
      console.error(error)
    }
  }

  return streamReportCallback
}
