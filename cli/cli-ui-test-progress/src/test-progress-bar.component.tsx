/* eslint-disable @typescript-eslint/method-signature-style */

import type { ReactElement } from 'react'

import { ProgressBar }       from '@inkjs/ui'
import { useEffect }         from 'react'
import { useState }          from 'react'
import React                 from 'react'

export interface TestProgressBarProps {
  tester: {
    on(
      event: 'start',
      listener: (data: { tests: Array<{ file: string; source: string; tests: number }> }) => void
    ): void
    on(event: 'test:pass', listener: (data: TestPass) => void): void
    on(event: 'test:fail', listener: (data: TestFail) => void): void
    on(event: 'end', listener: () => void): void
    off(
      event: 'start',
      listener: (data: { tests: Array<{ file: string; source: string; tests: number }> }) => void
    ): void
    off(event: 'test:pass', listener: (data: TestPass) => void): void
    off(event: 'test:fail', listener: (data: TestFail) => void): void
    off(event: 'end', listener: () => void): void
  }
}

export const TestProgressBar = ({ tester }: TestProgressBarProps): ReactElement | null => {
  const [total, setTotal] = useState<number>(0)
  const [complete, setComplete] = useState<number>(0)

  useEffect(() => {
    const onStart = (data: {
      tests: Array<{ file: string; source: string; tests: number }>
    }): void => {
      setTotal(data.tests.reduce((result, test) => result + test.tests + 1, 0))
    }

    const onComplete = (): void => {
      setComplete((c) => c + 1)
    }

    const onEnd = (): void => {
      setComplete(total)
    }

    tester.on('start', onStart)
    tester.on('test:pass', onComplete)
    tester.on('test:fail', onComplete)
    tester.on('end', onEnd)

    return (): void => {
      tester.off('start', onStart)
      tester.off('test:pass', onComplete)
      tester.off('test:fail', onComplete)
      tester.off('end', onEnd)
    }
  }, [tester, total, setTotal, setComplete])

  return <ProgressBar value={total > 0 && complete > 0 ? (complete / total) * 100 : 0} />
}
