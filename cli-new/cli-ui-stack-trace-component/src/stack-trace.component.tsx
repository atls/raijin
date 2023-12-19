import { parse }          from '@atls/stack-trace'

import React              from 'react'
// @ts-ignore
import { Text }           from 'ink'
// @ts-ignore
import { Box }            from 'ink'
// @ts-ignore
import { Spacer }         from 'ink'
import { useMemo }        from 'react'

import { SourcePreview }  from '@atls/cli-ui-source-component-new'

import { getFrameSource } from './utils'

export interface StackTraceProps {
  children: string
}

export const StackTrace = ({ children }: StackTraceProps) => {
  const stack = useMemo(() => parse(children), [children])
  const source = useMemo(() => (stack?.topFrame ? getFrameSource(stack.topFrame) : null), [stack])

  if (!stack) {
    return null
  }

  return (
    <Box flexDirection='column' flexGrow={1}>
      {source && stack?.topFrame?.line && (
        <Box>
          <SourcePreview line={stack?.topFrame?.line} column={stack?.topFrame?.column}>
            {source}
          </SourcePreview>
        </Box>
      )}
      {stack.frames.map((frame: any, index) => (
        <Box key={`${frame.file}-${frame.line}-${frame.column}-${index}`} justifyContent='flex-end'>
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
