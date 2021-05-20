import { supportsColor }    from 'supports-color'
import { codeFrameColumns } from '@babel/code-frame'

const { level } = supportsColor({ isTTY: true })

export const forceColor = level >= 1

export const codeFrameSource = (source, line: number, column?: number) =>
  codeFrameColumns(source, { start: { column, line } }, { highlightCode: forceColor, forceColor })
