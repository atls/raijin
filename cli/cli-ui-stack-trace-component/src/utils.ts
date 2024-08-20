// @ts-expect-error any
import type { StackFrame } from '@atls/stack-trace'

import { readFileSync }    from 'node:fs'

export const getFrameSource = (frame: StackFrame): string | null => {
  if (frame.sourceMap) {
    return frame.sourceMap.payload.sourcesContent[0]
  }

  if (frame.file) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return readFileSync(frame.file, 'utf-8')
      // eslint-disable-next-line
    } catch (error) {}
  }

  return null
}
