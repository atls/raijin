import React                     from 'react'
import { Text }                  from 'ink'
import { Box }                   from 'ink'
import { UncontrolledTextInput } from 'ink-text-input'

export const RequestCommitMessageSubject = ({ onSubmit }) => (
  <Box flexDirection='column'>
    <Box>
      <Text bold color='cyanBright'>
        Write a short description (max 93) chars):
      </Text>
    </Box>
    <Box>
      <Box marginRight={1}>
        <Text color='gray'>→</Text>
      </Box>
      <Box>
        <UncontrolledTextInput onSubmit={onSubmit} />
      </Box>
    </Box>
  </Box>
)
