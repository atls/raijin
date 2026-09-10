import type { ReactElement } from 'react'

import { ProgressBar }       from '@inkjs/ui'
import { Badge }             from '@inkjs/ui'
import { Box }               from 'ink'
import { Text }              from 'ink'
import React                 from 'react'

export interface ServiceProgressProps {
  message: string
  percent: number
}

export const ServiceProgress = ({ message, percent }: ServiceProgressProps): ReactElement => (
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
        <Badge color='cyan'>Service:</Badge>
        <Text> </Text>
        <Text color='white'>{message}</Text>
      </Box>
      <Box marginTop={1} marginBottom={1}>
        <ProgressBar value={percent} />
      </Box>
    </Box>
  </Box>
)
