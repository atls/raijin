import type { WriteStream }    from 'node:tty'
import type { ReactElement }   from 'react'

import { codeFrameColumns }    from '@babel/code-frame'
import { Text }                from 'ink'
import { createSupportsColor } from 'supports-color'
import React                   from 'react'

const { level } = createSupportsColor({ isTTY: true } as WriteStream) || { level: 0 }

export const forceColor = level >= 1

export const codeFrameSource = (
  source: string,
  line: number,
  column?: number,
  message?: string
): string =>
  codeFrameColumns(
    source,
    { start: { column, line } },
    { highlightCode: forceColor, forceColor, message }
  )

export interface SourcePreviewProps {
  children: string
  line: number
  column?: number
  message?: string
}

export const SourcePreview = ({
  children,
  line,
  column,
  message,
}: SourcePreviewProps): ReactElement => (
  <Text>{codeFrameSource(children, line, column, message)}</Text>
)
