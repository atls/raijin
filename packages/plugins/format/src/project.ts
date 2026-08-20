import type { FormatProjectInput }  from './interfaces/input.js'
import type { FormatProjectResult } from './interfaces/result.js'

import { formatFile }               from './mutation.js'
import { selectFiles }              from './selection.js'

export const formatProjectSources = async ({
  cwd,
  targets,
  workspacePackageNames,
}: FormatProjectInput): Promise<FormatProjectResult> => {
  const selectedFiles = await selectFiles(cwd, targets)
  const files: Array<FormatProjectResult['files'][number]> = []

  await selectedFiles.reduce<Promise<void>>(async (previous, file) => {
    await previous

    files.push(await formatFile(file.file, file.path, workspacePackageNames))
  }, Promise.resolve())

  return { files }
}
