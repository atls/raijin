import type { ReactElement }           from 'react'

import type { TestProgressBarProps }   from './test-progress-bar.component.jsx'
import type { TestProgressFilesProps } from './test-progress-files.component.jsx'

import { Box }                         from 'ink'
import { useState }                    from 'react'
import { useEffect }                   from 'react'
import React                           from 'react'

import { TestProgressBar }             from './test-progress-bar.component.jsx'
import { TestProgressFiles }           from './test-progress-files.component.jsx'

export interface TestProgressProps {
  tester: TestProgressBarProps['tester'] & TestProgressFilesProps['tester']
  cwd: string
}

export const TestProgress = ({ cwd, tester }: TestProgressProps): ReactElement | null => {
  const [complete, setComplete] = useState<boolean>(false)

  useEffect(() => {
    const onEnd = (): void => {
      setTimeout(() => {
        setComplete(true)
      }, 1000)
    }

    tester.on('end', onEnd)

    return (): void => {
      tester.off('end', onEnd)
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
          <TestProgressFiles cwd={cwd} tester={tester} />
        </Box>
        <Box marginTop={1} marginBottom={1}>
          <TestProgressBar tester={tester} />
        </Box>
      </Box>
    </Box>
  )
}
