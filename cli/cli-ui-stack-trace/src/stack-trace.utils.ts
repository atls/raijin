/* eslint-disable n/no-sync */

import type { StackFrame } from '@atls/stack-trace'

import { readFileSync }    from 'node:fs'
import { fileURLToPath }   from 'node:url'

export const getFrameSource = (frame: StackFrame): string | null => {
  if (frame.sourceMap) {
    return frame.sourceMap.payload.sourcesContent[0]
  }

  if (frame.file) {
    try {
      return readFileSync(
        frame.file.startsWith('file:/') ? fileURLToPath(new URL(frame.file)) : frame.file,
        'utf-8'
      )
    } catch {
      return null
    }
  }

  return null
}
