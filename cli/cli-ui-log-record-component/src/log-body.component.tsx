import type { Body }  from '@atls/logger'
import type { FC }    from 'react'

import { Box }        from 'ink'
import React          from 'react'

import { StackTrace } from '@atls/cli-ui-stack-trace-component'

export interface BodyProps {
  children: Body
}

export const LogBody: FC<BodyProps> = ({ children }) => {
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
