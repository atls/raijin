/* eslint-disable @typescript-eslint/method-signature-style */

import type { ReactElement } from 'react'

import { ProgressBar }       from '@inkjs/ui'
import { useEffect }         from 'react'
import { useState }          from 'react'
import React                 from 'react'

export interface IconsProgressBarProps {
  icons: {
    on(event: 'read:end' | 'save:end' | 'transform:end', listener: () => void): void
    off(event: 'read:end' | 'save:end' | 'transform:end', listener: () => void): void
  }
}

export const IconsProgressBar = ({ icons }: IconsProgressBarProps): ReactElement | null => {
  const [current, setCurrent] = useState<number>(0)

  useEffect(() => {
    const onRead = (): void => {
      setCurrent(33)
    }

    const onTransform = (): void => {
      setCurrent(66)
    }

    const onSave = (): void => {
      setCurrent(100)
    }

    icons.on('read:end', onRead)
    icons.on('transform:end', onTransform)
    icons.on('save:end', onSave)

    return (): void => {
      icons.off('read:end', onRead)
      icons.off('transform:end', onTransform)
      icons.off('save:end', onSave)
    }
  }, [icons, setCurrent])

  return <ProgressBar value={current} />
}
