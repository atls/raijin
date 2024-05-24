/* eslint-disable react/jsx-curly-brace-presence */

import type { JSX }              from 'react'

import { Text }                  from 'ink'
import { Box }                   from 'ink'
import { UncontrolledTextInput } from 'ink-text-input'
import React                     from 'react'
import figures                   from 'figures'

export interface RequestCommitMessageIssuesProps {
  onSubmit: (value: string) => void
}

export const RequestCommitMessageIssues = ({
  onSubmit,
}: RequestCommitMessageIssuesProps): JSX.Element => (
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
        <UncontrolledTextInput onSubmit={onSubmit} />
      </Box>
    </Box>
  </Box>
)
