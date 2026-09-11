import type { ReactElement }     from 'react'

import { Text }                  from 'ink'
import { Box }                   from 'ink'
import { UncontrolledTextInput } from 'ink-text-input'
import React                     from 'react'

interface RequestCommitMessageBodyProps {
  onSubmit: (value: string) => void
}

export const RequestCommitMessageBody = ({
  onSubmit,
}: RequestCommitMessageBodyProps): ReactElement => (
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
