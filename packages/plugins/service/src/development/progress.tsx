import type { ReactElement } from 'react'

import { Box }               from 'ink'
import { Text }              from 'ink'
import React                 from 'react'

const PROGRESS_WIDTH = 24

export interface ServiceProgressProps {
  message: string
  percent: number
}

export const ServiceProgress = ({ message, percent }: ServiceProgressProps): ReactElement => {
  const boundedPercent = Math.max(0, Math.min(100, percent))
  const completed = Math.round((boundedPercent / 100) * PROGRESS_WIDTH)
  const bar = `${'='.repeat(completed)}${' '.repeat(PROGRESS_WIDTH - completed)}`

  return (
    <Box position='relative' height={7}>
      <Box
        flexDirection='column'
        borderColor='gray'
        padding={1}
        borderStyle='round'
        position='absolute'
        height={7}
        width='100%'
      >
        <Box>
          <Text color='cyan'>Service:</Text>
          <Text> </Text>
          <Text color='white'>{message}</Text>
        </Box>
        <Box marginTop={1} marginBottom={1}>
          <Text>{`[${bar}] ${Math.round(boundedPercent)}%`}</Text>
        </Box>
      </Box>
    </Box>
  )
}
