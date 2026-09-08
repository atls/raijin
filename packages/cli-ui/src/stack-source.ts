import type { StackFrame } from '@monstrs/stack-trace'

import { readFileSync }    from 'node:fs'
import { fileURLToPath }   from 'node:url'

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
