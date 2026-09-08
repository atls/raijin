import type { ReactElement } from 'react'

import { EventEmitter }      from 'node:events'

import { render }            from 'ink'

const STATIC_COLUMNS = 160
const STATIC_ROWS = 24

class OutputCapture extends EventEmitter {
  readonly columns = STATIC_COLUMNS

  readonly rows = STATIC_ROWS

  readonly isTTY = false

  frame = ''

  write = (chunk: Uint8Array | string): boolean => {
    this.frame = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString()

    return true
  }
}

const toWriteStream = (capture: OutputCapture): NodeJS.WriteStream =>
  capture as unknown as NodeJS.WriteStream

export const renderStatic = (tree: ReactElement): string => {
  const stdout = new OutputCapture()
  const stderr = new OutputCapture()
  const { unmount } = render(tree, {
    stdout: toWriteStream(stdout),
    stderr: toWriteStream(stderr),
    debug: true,
    exitOnCtrlC: false,
    patchConsole: false,
  })

  try {
    return [stdout.frame, stderr.frame].filter(Boolean).join('\n')
  } finally {
    unmount()
  }
}
