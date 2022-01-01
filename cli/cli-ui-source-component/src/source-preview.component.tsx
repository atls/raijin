import React               from 'react'
import { Text }            from 'ink'
import { FC }              from 'react'

import { codeFrameSource } from './utils'

export interface SourcePreviewProps {
  children: string
  line: number
  column?: number
}

export const SourcePreview: FC<SourcePreviewProps> = ({ children, line, column }) => (
  <Text>{codeFrameSource(children, line, column)}</Text>
)
