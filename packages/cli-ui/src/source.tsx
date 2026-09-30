import type { ReactElement }   from 'react'

import { codeFrameColumns }    from '@babel/code-frame'
import { Text }                from 'ink'
import { createSupportsColor } from 'supports-color'
import React                   from 'react'

interface SourcePreviewProps {
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
}: SourcePreviewProps): ReactElement => {
  const colorSupport = createSupportsColor(process.stdout)
  const forceColor = colorSupport !== false && colorSupport.level >= 1

  return (
    <Text>
      {codeFrameColumns(
        children,
        { start: { column, line } },
        { highlightCode: forceColor, forceColor, message }
      )}
    </Text>
  )
}
