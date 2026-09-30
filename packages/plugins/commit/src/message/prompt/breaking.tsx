import type { ReactElement }     from 'react'

import { Text }                  from 'ink'
import { Box }                   from 'ink'
import { UncontrolledTextInput } from 'ink-text-input'
import React                     from 'react'

export interface RequestCommitMessageBreakingProps {
  initialValue?: string
  onSubmit: (value: string) => void
}

export const RequestCommitMessageBreaking = ({
  initialValue,
  onSubmit,
}: RequestCommitMessageBreakingProps): ReactElement => (
  <Box flexDirection='column'>
    <Box>
      <Text bold color='cyanBright'>
        Describe the breaking changes:
      </Text>
    </Box>
    <Box>
      <Box marginRight={1}>
        <Text color='gray'>→</Text>
      </Box>
      <Box>
        <UncontrolledTextInput initialValue={initialValue} onSubmit={onSubmit} />
      </Box>
    </Box>
  </Box>
)
