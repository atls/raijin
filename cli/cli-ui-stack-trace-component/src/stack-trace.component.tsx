import { parse }          from '@atls/stack-trace'
import React              from 'react'
import { FC }             from 'react'
import { useMemo }        from 'react'
import { Text }           from 'ink'
import { Box }            from 'ink'
import { Spacer }         from 'ink'

import { SourcePreview }  from '@atls/cli-ui-source-component'

import { getFrameSource } from './utils'

export interface StackTraceProps {
  children: string
}

export const StackTrace: FC<StackTraceProps> = ({ children }) => {
  const stack = useMemo(() => parse(children), [children])
  const source = useMemo(() => (stack?.topFrame ? getFrameSource(stack.topFrame) : null), [stack])

  if (!stack) {
    return null
  }

  return (
    <Box flexDirection='column' flexGrow={1}>
      {source && stack?.topFrame?.line && (
        <>
          <Box paddingLeft={2} marginTop={1}>
            <Text backgroundColor='red' color='white'>
              Location
            </Text>
          </Box>
          <Box paddingLeft={4}>
            <SourcePreview line={stack?.topFrame?.line} column={stack?.topFrame?.column}>
              {source}
            </SourcePreview>
          </Box>
        </>
      )}
      <Box paddingLeft={2} marginTop={1}>
        <Text backgroundColor='red' color='white'>
          Stack
        </Text>
      </Box>
      {stack.frames.map((frame: any) => (
        <Box key={`${frame.file}-${frame.line}`} justifyContent='flex-end' paddingLeft={4}>
          <Text>{frame.function}</Text>
          <Spacer />
          <Text color='gray'>{frame.file}</Text>
          {frame.line && <Text color='gray'>:{frame.line}</Text>}
          {frame.column && <Text color='gray'>:{frame.column}</Text>}
        </Box>
      ))}
    </Box>
  )
}
