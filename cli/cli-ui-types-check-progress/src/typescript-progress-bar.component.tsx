/* eslint-disable @typescript-eslint/method-signature-style */

import type { ReactElement } from 'react'

import { ProgressBar }       from '@inkjs/ui'
import { useEffect }         from 'react'
import { useState }          from 'react'
import { useRef }            from 'react'
import React                 from 'react'

export interface TypeScriptProgressBarProps {
  typescript: {
    on(event: 'end', listener: () => void): void
    off(event: 'end', listener: () => void): void
  }
}

export const TypeScriptProgressBar = ({
  typescript,
}: TypeScriptProgressBarProps): ReactElement | null => {
  const [current, setCurrent] = useState<number>(10)
  const interval = useRef<NodeJS.Timeout | undefined>()

  useEffect(() => {
    interval.current = setInterval(() => {
      setCurrent((cur) => cur + 10)
    }, 100)

    const onEnd = (): void => {
      setTimeout(() => {
        setCurrent(100)

        if (interval.current) {
          clearInterval(interval.current)
        }
      }, 600)
    }

    typescript.on('end', onEnd)

    return (): void => {
      typescript.off('end', onEnd)

      if (interval.current) {
        clearInterval(interval.current)
      }
    }
  }, [typescript, interval, setCurrent])

  return <ProgressBar value={(current / 100) * 100} />
}
