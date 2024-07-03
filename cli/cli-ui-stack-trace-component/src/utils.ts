import { readFileSync } from 'node:fs'

// @ts-expect-error any
import { StackFrame }   from '@atls/stack-trace'

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
