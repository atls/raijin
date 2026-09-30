import type { ReactElement } from 'react'

import { Box }               from 'ink'
import { Text }              from 'ink'
import { useMemo }           from 'react'
import React                 from 'react'
import StackUtils            from 'stack-utils'

import { FileLink }          from './location.js'
import { SourcePreview }     from './source.js'
import { getFrameSource }    from './stack-source.js'

interface StackTraceProps {
  children: string
  cwd?: string
}

const parseStack = (stack: string): Array<StackUtils.StackLineData> => {
  const stackUtils = new StackUtils({ cwd: process.cwd() })

  return stack.split('\n').flatMap((line) => {
    const frame = stackUtils.parseLine(line.trim())

    return frame ? [frame] : []
  })
}

const frameKey = (frame: StackUtils.StackLineData, index: number): string =>
  [frame.file, frame.line, frame.column, frame.function, index].join(':')

export const StackTrace = ({ children, cwd }: StackTraceProps): ReactElement => {
  const frames = useMemo(() => parseStack(children), [children])
  const topFrame = useMemo(() => frames.find((frame) => frame.file), [frames])
  const source = useMemo(() => (topFrame ? getFrameSource(topFrame) : null), [topFrame])

  return (
    <Box flexDirection='column' flexGrow={1}>
      {source && topFrame?.line !== undefined && (
        <Box marginBottom={1}>
          <SourcePreview line={topFrame.line} column={topFrame.column}>
            {source}
          </SourcePreview>
        </Box>
      )}
      {frames.map((frame, index) => (
        <Box key={frameKey(frame, index)} flexDirection='row'>
          <Box flexBasis='30%'>
            <Text>{frame.function}</Text>
          </Box>
          <Box flexBasis='70%' justifyContent='flex-end'>
            {frame.file && (
              <FileLink cwd={cwd} target={frame.file} line={frame.line} column={frame.column} />
            )}
          </Box>
        </Box>
      ))}
    </Box>
  )
}
