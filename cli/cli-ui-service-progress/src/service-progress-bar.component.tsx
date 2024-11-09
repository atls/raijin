/* eslint-disable @typescript-eslint/method-signature-style */

import type { ReactElement } from 'react'

import { ProgressBar }       from '@inkjs/ui'
import { useEffect }         from 'react'
import { useState }          from 'react'
import React                 from 'react'

export interface ServiceProgressBarProps {
  service: {
    on(
      event: 'build:progress',
      listener: (data: { percent: number; message: string }) => void
    ): void
    off(
      event: 'build:progress',
      listener: (data: { percent: number; message: string }) => void
    ): void
  }
}

export const ServiceProgressBar = ({ service }: ServiceProgressBarProps): ReactElement | null => {
  const [progress, setProgress] = useState<number>(0)

  useEffect(() => {
    const onServicePercent = ({ percent }: { percent: number }): void => {
      setProgress(percent)
    }

    service.on('build:progress', onServicePercent)

    return (): void => {
      service.off('build:progress', onServicePercent)
    }
  }, [service, setProgress])

  return <ProgressBar value={progress} />
}
