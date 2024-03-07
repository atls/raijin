import type { WriteStream }    from 'node:tty'

import { codeFrameColumns }    from '@babel/code-frame'
import { createSupportsColor } from 'supports-color'

const { level } = createSupportsColor({ isTTY: true } as WriteStream) || { level: 0 }

export const forceColor = level >= 1

export const codeFrameSource = (source: string, line: number, column?: number): string =>
  codeFrameColumns(source, { start: { column, line } }, { highlightCode: forceColor, forceColor })
