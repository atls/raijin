import type { ReactElement } from 'react'

import { Text }              from 'ink'
import { Box }               from 'ink'
import React                 from 'react'

import { FilePath }          from '@atls/cli-ui-file-path-component'
import { Line }              from '@atls/cli-ui-line-component'
import { SourcePreview }     from '@atls/cli-ui-source-preview-component'

export interface TestFailureProps {
  details: {
    error: Error
  }
  source?: string
  file?: string
  line?: number
  column?: number
}

export const TestFailure = ({
  details,
  source,
  file,
  line,
  column,
}: TestFailureProps): ReactElement => {
  if (!(file && source)) {
    return (
      <Box
        flexDirection='column'
        borderStyle='round'
        borderColor='gray'
        paddingX={2}
        paddingY={1}
        width='100%'
      >
        <Text>{details.error.message}</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection='column' borderStyle='round' borderColor='gray' width='100%'>
      <Box marginBottom={1} marginTop={1} paddingX={2}>
        <FilePath line={line} column={column}>
          {file}
        </FilePath>
      </Box>
      <Line offset={2} />
      <Box marginBottom={1}>
        <SourcePreview line={line ?? 1} column={column ?? 1}>
          {source}
        </SourcePreview>
      </Box>
      <Line offset={2} />
      <Box marginBottom={1} marginTop={1} paddingX={2}>
        <Text color='white'>{details.error.message}</Text>
      </Box>
    </Box>
  )
}
