import React                     from 'react'
import { Text }                  from 'ink'
import { Box }                   from 'ink'
import { UncontrolledTextInput } from 'ink-text-input'

export const RequestCommitMessageBody = ({ onSubmit }) => (
  <Box flexDirection='column'>
    <Box>
      <Text bold color='cyanBright'>
        Please give a long description:
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
