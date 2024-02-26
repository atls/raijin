import React               from 'react'
import { Text }            from 'ink'

import { codeFrameSource } from './utils.js'

export interface SourcePreviewProps {
  children: string
  line: number
  column?: number
}

export const SourcePreview = ({ children, line, column }: SourcePreviewProps) => (
  <Text>{codeFrameSource(children, line, column)}</Text>
)
