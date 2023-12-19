import React             from 'react'
import { Text }          from 'ink'
import { Box }           from 'ink'
import { FC }            from 'react'

import { SourcePreview } from '@atls/cli-ui-source-component-new'

export interface ESLintResultMessageProps {
  ruleId: string | null
  message: string
  line: number
  column: number
}

export interface ESLintResultMessageElProp {
  filePath: string
  source?: string
  message: ESLintResultMessageProps
}

// @ts-ignore
export const ESLintResultMessage: FC<ESLintResultMessageElProp> = ({
  filePath,
  message,
  source,
}) => {
  return (
    <Box flexDirection='column'>
      <Box marginBottom={1}>
        <Text color='cyan'>
          {filePath}
          <Text color='yellow'>
            :{message.line}:{message.column}
          </Text>
        </Text>
      </Box>
      <Box marginBottom={1} marginLeft={2}>
        <Text bold color='red'>
          Error
        </Text>
        <Text color='white'>: {message.message}</Text>
        <Text color='gray'> {message.ruleId}</Text>
      </Box>
      {source && (
        <Box marginBottom={1}>
          <SourcePreview line={message.line} column={message.column}>
            {source}
          </SourcePreview>
        </Box>
      )}
    </Box>
  )
}
