/* eslint-disable @typescript-eslint/method-signature-style */

import type { ReactElement } from 'react'

import { relative }          from 'node:path'

import { Badge }             from '@inkjs/ui'
import { Box }               from 'ink'
import { Text }              from 'ink'
import { useEffect }         from 'react'
import { useState }          from 'react'
import React                 from 'react'
import figures               from 'figures'

export interface TestProgressFilesProps {
  cwd: string
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

export interface TestProgressFilesIconProps {
  state?: 'fail' | 'pass'
}

export const TestProgressFilesIcon = ({ state }: TestProgressFilesIconProps): ReactElement => {
  if (state === 'fail') {
    return <Text color='red'>{figures.cross}</Text>
  }

  if (state === 'pass') {
    return <Text color='green'>{figures.tick}</Text>
  }

  return <Text color='white'>{figures.circleDotted}</Text>
}

export const TestProgressFiles = ({ cwd, tester }: TestProgressFilesProps): ReactElement | null => {
  const [tests, setTests] = useState<
    Array<{ file: string; source: string; tests: number }> | undefined
  >(undefined)
  const [current, setCurrent] = useState<{ file: string; state: 'fail' | 'pass' } | undefined>(
    undefined
  )
  const [total, setTotal] = useState<number>(0)
  const [pass, setPass] = useState<number>(0)
  const [fail, setFail] = useState<number>(0)

  useEffect(() => {
    const onStart = (data: {
      tests: Array<{ file: string; source: string; tests: number }>
    }): void => {
      setTotal(data.tests.reduce((result, test) => result + test.tests, 0))
      setTests(data.tests)
    }

    const onPass = (data: TestPass): void => {
      setPass((p) => p + 1)

      if (data.file) {
        setCurrent({
          file: relative(cwd, data.file),
          state: 'pass',
        })
      }
    }

    const onFail = (data: TestFail): void => {
      setFail((f) => f + 1)

      if (data.file) {
        setCurrent({
          file: relative(cwd, data.file),
          state: 'fail',
        })
      }
    }

    tester.on('start', onStart)
    tester.on('test:pass', onPass)
    tester.on('test:fail', onFail)

    return (): void => {
      tester.off('start', onStart)
      tester.off('test:pass', onPass)
      tester.off('test:fail', onFail)
    }
  }, [tester, setTotal, setPass, setFail, setCurrent])

  if (!tests) {
    return (
      <Box flexDirection='row'>
        <Badge color='cyan'>Test:</Badge>
        <Text> </Text>
        <Text color='white'>Loading...</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection='row' width='100%'>
      <Box flexGrow={1}>
        <Badge color='cyan'>Test:</Badge>
        <Text> </Text>
        {!!current && <Text color='white'>{current.file}</Text>}
      </Box>
      <Box flexDirection='row'>
        <Box>
          <TestProgressFilesIcon state={current?.state} />
          <Text> </Text>
          <Text color='green'>{pass} Pass</Text>
          <Text> </Text>
          <Text color='red'>{fail} Fail</Text>
          <Text> </Text>
          <Text color='white'>{total} Total</Text>
          <Text> </Text>
          <Text color='gray'>{tests.length || 0} Files</Text>
          <Text> </Text>
        </Box>
      </Box>
    </Box>
  )
}
