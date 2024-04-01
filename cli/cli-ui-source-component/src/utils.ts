import { codeFrameColumns }    from '@babel/code-frame'

// @ts-ignore
import { createSupportsColor } from 'supports-color'

const { level } = createSupportsColor({ isTTY: true })

export const forceColor = level >= 1

export const codeFrameSource = (source, line: number, column?: number) =>
  codeFrameColumns(source, { start: { column, line } }, { highlightCode: forceColor, forceColor })
