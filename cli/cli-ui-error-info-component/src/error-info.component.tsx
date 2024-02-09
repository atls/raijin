import React          from 'react'
import { Box }        from 'ink'
import { Text }       from 'ink'

import { StackTrace } from '@atls/cli-ui-stack-trace-component'

export interface ErrorProps {
  error: Error
}

export interface ErrorMessageProps {
  children?: string
}

export const ErrorMessage: FC<ErrorMessageProps> = ({ children }) => {
  if (!children) {
    return null
  }

  return (
    <Box marginBottom={1}>
      <Text bold color='red'>
        {children}
      </Text>
    </Box>
  )
}

export const ErrorInfo: FC<ErrorProps> = ({ error }) => (
  <Box flexDirection='column'>
    <ErrorMessage>{error.message}</ErrorMessage>
    {!!error.stack && (
      <Box>
        <StackTrace>{error.stack}</StackTrace>
      </Box>
    )}
  </Box>
)
