import React          from 'react'
import { Box }        from 'ink'
import { Text }       from 'ink'

import { StackTrace } from '@atls/cli-ui-stack-trace-component-new'

export interface ErrorProps {
  error: Error
}

export const ErrorMessage = ({ children }) => {
  if (!children) {
    return null
  }

  return (
    <Box marginBottom={1}>
      <Text color='red' bold>
        {children}
      </Text>
    </Box>
  )
}

export const ErrorInfo = ({ error }: ErrorProps) => (
  <Box flexDirection='column'>
    <ErrorMessage>{error.message}</ErrorMessage>
    {error.stack && (
      <Box>
        <StackTrace>{error.stack}</StackTrace>
      </Box>
    )}
  </Box>
)
