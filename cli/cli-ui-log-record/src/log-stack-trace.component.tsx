import type { LogAttributeValue } from '@atls/logger'
import type { ReactElement }      from 'react'

import { Box }                    from 'ink'
import React                      from 'react'

import { StackTrace }             from '@atls/cli-ui-stack-trace-component'

export interface LogStackTraceProps {
  children?: LogAttributeValue | string
}

export const LogStackTrace = ({ children }: LogStackTraceProps): ReactElement | null => {
  if (!children) {
    return null
  }

  return (
    <Box paddingBottom={1} marginTop={1}>
      <StackTrace>{children as string}</StackTrace>
    </Box>
  )
}
