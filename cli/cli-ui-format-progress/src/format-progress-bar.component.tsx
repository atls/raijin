/* eslint-disable @typescript-eslint/method-signature-style */

import type { ReactElement } from 'react'

import { ProgressBar }       from '@inkjs/ui'
import { useEffect }         from 'react'
import { useState }          from 'react'
import React                 from 'react'

export interface FormatProgressBarProps {
  formatter: {
    on(event: 'start', listener: (data: { files: Array<string> }) => void): void
    on(
      event: 'format:end',
      listener: (data: {
        result: { filePath: string; errorCount: number; warningCount: number }
      }) => void
    ): void
    on(event: 'end', listener: () => void): void
    off(event: 'start', listener: (data: { files: Array<string> }) => void): void
    off(
      event: 'format:end',
      listener: (data: {
        result: { filePath: string; errorCount: number; warningCount: number }
      }) => void
    ): void
    off(event: 'end', listener: () => void): void
  }
}

export const FormatProgressBar = ({ formatter }: FormatProgressBarProps): ReactElement | null => {
  const [total, setTotal] = useState<number>(0)
  const [current, setCurrent] = useState<number>(0)

  useEffect(() => {
    const onStart = ({ files }: { files: Array<string> }): void => {
      setTotal(files.length)
    }

    const onFormatEnd = (): void => {
      setCurrent((cur) => cur + 1)
    }

    const onEnd = (): void => {
      setCurrent(total)
    }

    formatter.on('start', onStart)
    formatter.on('format:end', onFormatEnd)
    formatter.on('end', onEnd)

    return (): void => {
      formatter.off('start', onStart)
      formatter.off('format:end', onFormatEnd)
      formatter.off('end', onEnd)
    }
  }, [formatter, total, setTotal, setCurrent])

  return <ProgressBar value={total > 0 ? (current / total) * 100 : 0} />
}
