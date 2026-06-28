import type { StreamReport }        from '@yarnpkg/core'

import { ppath }                    from '@yarnpkg/fslib'
import { xfs }                      from '@yarnpkg/fslib'

import { runSchematic }             from '../helpers/index.js'
import { writeTmpSchematic }        from '../helpers/index.js'
import { prepareTmpDir }            from '../helpers/index.js'
import { ensureSchematicSucceeded } from '../helpers/index.js'

type StreamReportCallbackType = Parameters<typeof StreamReport.start>[1]

export const getStreamReportCallback = async (
  options: Record<string, string>
): Promise<StreamReportCallbackType> => {
  const streamReportCallback = async (report: StreamReport): Promise<void> => {
    const tmpDir = await xfs.mktempPromise()
    const collectionPath = ppath.join(tmpDir, 'collection.json')

    await writeTmpSchematic(tmpDir)
    await prepareTmpDir(tmpDir)
    ensureSchematicSucceeded(await runSchematic('project', options, collectionPath))
  }

  return streamReportCallback
}
