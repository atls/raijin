/* eslint-disable @typescript-eslint/method-signature-style */

import type { ReactElement }                from 'react'

import type { ServiceProgressBarProps }     from './service-progress-bar.component.js'
import type { ServiceProgressMessageProps } from './service-progress-message.component.js'

import { Box }                              from 'ink'
import { useState }                         from 'react'
import { useEffect }                        from 'react'
import React                                from 'react'

import { ServiceProgressBar }               from './service-progress-bar.component.jsx'
import { ServiceProgressMessage }           from './service-progress-message.component.jsx'

export interface ServiceProgressProps {
  service: ServiceProgressBarProps['service'] &
    ServiceProgressMessageProps['service'] & {
      on(event: 'end', listener: () => void): void
      off(event: 'end', listener: () => void): void
    }
}

export const ServiceProgress = ({ service }: ServiceProgressProps): ReactElement | null => {
  const [complete, setComplete] = useState<boolean>(false)

  useEffect(() => {
    const onEnd = (): void => {
      setTimeout(() => {
        setComplete(true)
      }, 1)
    }

    service.on('end', onEnd)

    return (): void => {
      service.off('end', onEnd)
    }
  }, [setComplete])

  if (complete) {
    return null
  }

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
          <ServiceProgressMessage service={service} />
        </Box>
        <Box marginTop={1} marginBottom={1}>
          <ServiceProgressBar service={service} />
        </Box>
      </Box>
    </Box>
  )
}
