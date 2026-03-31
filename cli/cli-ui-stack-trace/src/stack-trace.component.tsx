import type { StackFrame }   from '@monstrs/stack-trace'
import type { ReactElement } from 'react'

import { parse }             from '@monstrs/stack-trace'
import { Text }              from 'ink'
import { Box }               from 'ink'
import { nanoid }            from 'nanoid'
import { useMemo }           from 'react'
import React                 from 'react'

import { FileLink }          from '@atls/cli-ui-file-link-component'
import { SourcePreview }     from '@atls/cli-ui-source-preview-component'

import { getFrameSource }    from './stack-trace.utils.js'

export interface StackTraceProps {
  children: string
  cwd?: string
}

export const StackTrace = ({ children, cwd }: StackTraceProps): ReactElement | null => {
  const stack = useMemo(() => parse(children), [children])
  const topFrame = useMemo(() => stack.topFrame || stack.frames.at(0), [stack])
  const source = useMemo(() => (topFrame ? getFrameSource(topFrame) : null), [topFrame])

  return (
    <Box flexDirection='column' flexGrow={1}>
      {!!source && !!stack.topFrame?.line && (
        <Box marginBottom={1}>
          <SourcePreview line={stack.topFrame.line} column={stack.topFrame.column}>
            {source}
          </SourcePreview>
        </Box>
      )}
      {stack.frames.map((frame: StackFrame) => (
        <Box key={nanoid()} flexDirection='row'>
          <Box flexBasis='30%'>
            <Text>{frame.function}</Text>
          </Box>
          <Box flexBasis='70%' justifyContent='flex-end'>
            {!!frame.file && (
              <FileLink cwd={cwd} url={frame.file} line={frame.line} column={frame.column} />
            )}
          </Box>
        </Box>
      ))}
    </Box>
  )
}
