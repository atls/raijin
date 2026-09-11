import type { ReactElement }     from 'react'

import { Text }                  from 'ink'
import { Box }                   from 'ink'
import { UncontrolledTextInput } from 'ink-text-input'
import React                     from 'react'

export interface RequestCommitMessageSubjectProps {
  onSubmit: (value: string) => void
}

export const RequestCommitMessageSubject = ({
  onSubmit,
}: RequestCommitMessageSubjectProps): ReactElement => (
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
