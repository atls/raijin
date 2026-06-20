import type { StreamReport }        from '@yarnpkg/core'

import { ppath }                    from '@yarnpkg/fslib'
import { xfs }                      from '@yarnpkg/fslib'

import { runSchematicHelper }       from '../helpers/index.js'
import { writeTmpSchematicHelper }  from '../helpers/index.js'
import { prepareTmpDir }            from '../helpers/index.js'
import { ensureSchematicSucceeded } from '../helpers/index.js'

type StreamReportCallbackType = Parameters<typeof StreamReport.start>[1]

export const getStreamReportCallback = async (
  options: Record<string, string>
): Promise<StreamReportCallbackType> => {
  const streamReportCallback = async (report: StreamReport): Promise<void> => {
    const tmpDir = await xfs.mktempPromise()
    const collectionPath = ppath.join(tmpDir, 'collection.json')
    const { cwd } = options

    await writeTmpSchematicHelper(tmpDir, cwd)
    await prepareTmpDir(tmpDir)
    ensureSchematicSucceeded(await runSchematicHelper('project', options, collectionPath))
  }

  return streamReportCallback
}
