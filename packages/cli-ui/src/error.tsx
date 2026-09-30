import type { ReactElement } from 'react'

import { Box }               from 'ink'
import { Text }              from 'ink'
import React                 from 'react'

import { StackTrace }        from './stack.js'

interface ErrorInfoProps {
  error: Error
  cwd?: string
}

interface ErrorMessageProps {
  children?: string
}

const ErrorMessage = ({ children }: ErrorMessageProps): ReactElement | null => {
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

export const ErrorInfo = ({ error, cwd }: ErrorInfoProps): ReactElement => (
  <Box flexDirection='column' borderStyle='single' borderColor='gray' paddingX={2} paddingY={1}>
    <ErrorMessage>{error.message}</ErrorMessage>
    {error.stack && (
      <Box>
        <StackTrace cwd={cwd}>{error.stack}</StackTrace>
      </Box>
    )}
  </Box>
)
