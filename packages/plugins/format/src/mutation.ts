import type { FormattedFileResult } from './interfaces/result.js'

import { readFile }                 from 'node:fs/promises'
import { writeFile }                from 'node:fs/promises'

import { format }                   from 'prettier'

import { resolvePrettierProject }   from '@atls/raijin/config/prettier'

export const formatFile = async (
  file: string,
  path: string,
  workspacePackageNames?: ReadonlyArray<string>
): Promise<FormattedFileResult> => {
  const content = await readFile(path, 'utf8')
  const configuration = await resolvePrettierProject({
    filepath: path,
    plugin: { workspacePackageNames },
  })
  const output = await format(content, { ...configuration, filepath: file })

  if (output !== content) {
    await writeFile(path, output, 'utf8')
  }

  return { file, status: output === content ? 'unchanged' : 'changed' }
}
