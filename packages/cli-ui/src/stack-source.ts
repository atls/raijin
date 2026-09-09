import type { SourceMap } from 'node:module'
import type StackUtils    from 'stack-utils'

import { readFileSync }   from 'node:fs'
import { fileURLToPath }  from 'node:url'

type StackFrame = StackUtils.StackLineData & {
  sourceMap?: SourceMap
}

export const getFrameSource = (frame: StackFrame): string | null => {
  const mappedSource = frame.sourceMap?.payload.sourcesContent[0]

  if (mappedSource) {
    return mappedSource
  }

  if (!frame.file) {
    return null
  }

  try {
    // eslint-disable-next-line n/no-sync
    return readFileSync(
      frame.file.startsWith('file:') ? fileURLToPath(frame.file) : frame.file,
      'utf-8'
    )
  } catch {
    return null
  }
}
