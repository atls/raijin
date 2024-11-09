import type { ReactElement } from 'react'

import { Text }              from 'ink'
import { Box }               from 'ink'
import React                 from 'react'

import { FilePath }          from '@atls/cli-ui-file-path-component'
import { Line }              from '@atls/cli-ui-line-component'
import { SourcePreview }     from '@atls/cli-ui-source-preview-component'

export interface LintResultMessageProps {
  ruleId: string | null
  message: string
  line: number
  column: number
}

export interface LintResultMessageElProp {
  message: LintResultMessageProps
  filePath: string
  source?: string
}

export const LintResultMessage = ({
  filePath,
  message,
  source,
}: LintResultMessageElProp): ReactElement => (
  <Box flexDirection='column' borderStyle='round' borderColor='gray' width='100%'>
    <Box marginBottom={1} marginTop={1} marginX={2}>
      <Box flexDirection='row' flexGrow={1}>
        <FilePath line={message.line} column={message.column}>
          {filePath}
        </FilePath>
      </Box>
      <Box>
        <Text color='gray'> {message.ruleId}</Text>
      </Box>
    </Box>
    <Box>
      <Line offset={2} />
    </Box>
    {!!source && (
      <>
        <Box marginBottom={1}>
          <SourcePreview line={message.line} column={message.column}>
            {source}
          </SourcePreview>
        </Box>
        <Line offset={2} />
      </>
    )}
    <Box marginBottom={1} marginTop={1} marginX={2}>
      <Text color='white'> {message.message}</Text>
    </Box>
  </Box>
)
