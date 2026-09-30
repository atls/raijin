import type { ReactElement } from 'react'

import { Text }              from 'ink'
import React                 from 'react'

export interface MessageProps {
  children?: string
}

export const LogMessage = ({ children }: MessageProps): ReactElement | null => {
  if (!children) {
    return null
  }

  return <Text>{children}</Text>
}
