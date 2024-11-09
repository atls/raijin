/* eslint-disable @typescript-eslint/method-signature-style */

import type { ReactElement } from 'react'

import { ProgressBar }       from '@inkjs/ui'
import { useEffect }         from 'react'
import { useState }          from 'react'
import React                 from 'react'

export interface LintProgressBarProps {
  linter: {
    on(event: 'start', listener: (data: { files: Array<string> }) => void): void
    on(
      event: 'lint:end',
      listener: (data: {
        result: { filePath: string; errorCount: number; warningCount: number }
      }) => void
    ): void
    on(event: 'end', listener: () => void): void
    off(event: 'start', listener: (data: { files: Array<string> }) => void): void
    off(
      event: 'lint:end',
      listener: (data: {
        result: { filePath: string; errorCount: number; warningCount: number }
      }) => void
    ): void
    off(event: 'end', listener: () => void): void
  }
}

export const LintProgressBar = ({ linter }: LintProgressBarProps): ReactElement | null => {
  const [total, setTotal] = useState<number>(0)
  const [current, setCurrent] = useState<number>(0)

  useEffect(() => {
    const onStart = ({ files }: { files: Array<string> }): void => {
      setTotal(files.length)
    }

    const onLintEnd = (): void => {
      setCurrent((cur) => cur + 1)
    }

    const onEnd = (): void => {
      setCurrent(total)
    }

    linter.on('start', onStart)
    linter.on('lint:end', onLintEnd)
    linter.on('end', onEnd)

    return (): void => {
      linter.off('start', onStart)
      linter.off('lint:end', onLintEnd)
      linter.off('end', onEnd)
    }
  }, [linter, total, setTotal, setCurrent])

  return <ProgressBar value={total > 0 ? (current / total) * 100 : 0} />
}
