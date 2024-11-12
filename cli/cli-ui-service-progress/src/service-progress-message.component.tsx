/* eslint-disable @typescript-eslint/method-signature-style */

import type { ReactElement } from 'react'

import { Badge }             from '@inkjs/ui'
import { Box }               from 'ink'
import { Text }              from 'ink'
import { useEffect }         from 'react'
import { useState }          from 'react'
import React                 from 'react'

export interface ServiceProgressMessageProps {
  service: {
    on(event: 'build:progress', listener: (data: { message: string }) => void): void
    off(event: 'build:progress', listener: (data: { message: string }) => void): void
  }
}

export const ServiceProgressMessage = ({
  service,
}: ServiceProgressMessageProps): ReactElement | null => {
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    const onBuildProgress = (data: { message: string }): void => {
      setMessage(data.message)
    }

    service.on('build:progress', onBuildProgress)

    return (): void => {
      service.off('build:progress', onBuildProgress)
    }
  }, [service, setMessage])

  return (
    <Box flexDirection='row' width='100%'>
      <Box flexGrow={1}>
        <Badge color='cyan'>Service:</Badge>
        <Text> </Text>
        <Text color='white'>{message}</Text>
      </Box>
    </Box>
  )
}
