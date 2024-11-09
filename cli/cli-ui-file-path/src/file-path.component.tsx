import type { ReactElement } from 'react'

import { Text }              from 'ink'
import React                 from 'react'

export interface FilePathProps {
  children: string
  line?: number
  column?: number
}

export const FilePath = ({ children, line = 0, column = 0 }: FilePathProps): ReactElement => (
  <Text color='cyan'>
    {children}
    <Text color='yellow'>
      :{line}:{column}
    </Text>
  </Text>
)
