import type { Body }  from '@atls/logger'

import React          from 'react'
import { Box }        from 'ink'

import { StackTrace } from '@atls/cli-ui-stack-trace-component-new'

export interface BodyProps {
  children: Body
}

export const LogBody = ({ children }: BodyProps) => {
  if (typeof children === 'string') {
    return null
  }

  if (children.stack) {
    return (
      <Box paddingBottom={1}>
        <StackTrace>{children.stack}</StackTrace>
      </Box>
    )
  }

  return null
}
