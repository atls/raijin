/* eslint-disable react/jsx-curly-brace-presence */

import type { ReactElement }     from 'react'

import { Text }                  from 'ink'
import { Box }                   from 'ink'
import { UncontrolledTextInput } from 'ink-text-input'
import React                     from 'react'
import figures                   from 'figures'

export interface RequestCommitMessageIssuesProps {
  initialValue?: string
  onSubmit: (value: string) => void
}

export const RequestCommitMessageIssues = ({
  initialValue,
  onSubmit,
}: RequestCommitMessageIssuesProps): ReactElement => (
  <Box flexDirection='column'>
    <Box>
      <Text bold color='cyanBright'>
        {'Add issue references (e.g. "fix #123, re #124".):'}
      </Text>
    </Box>
    <Box>
      <Box marginRight={1}>
        <Text color='gray'>{figures.arrowRight}</Text>
      </Box>
      <Box>
        <UncontrolledTextInput initialValue={initialValue} onSubmit={onSubmit} />
      </Box>
    </Box>
  </Box>
)
