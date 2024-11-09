import type { ReactElement }           from 'react'

import type { LintProgressBarProps }   from './lint-progress-bar.component.js'
import type { LintProgressFilesProps } from './lint-progress-files.component.js'

import { Box }                         from 'ink'
import { useState }                    from 'react'
import { useEffect }                   from 'react'
import React                           from 'react'

import { LintProgressBar }             from './lint-progress-bar.component.js'
import { LintProgressFiles }           from './lint-progress-files.component.js'

export interface LintProgressProps {
  linter: LintProgressBarProps['linter'] & LintProgressFilesProps['linter']
  cwd: string
}

export const LintProgress = ({ cwd, linter }: LintProgressProps): ReactElement | null => {
  const [complete, setComplete] = useState<boolean>(false)

  useEffect(() => {
    const onEnd = (): void => {
      setTimeout(() => {
        setComplete(true)
      }, 1)
    }

    linter.on('end', onEnd)

    return (): void => {
      linter.off('end', onEnd)
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
          <LintProgressFiles cwd={cwd} linter={linter} />
        </Box>
        <Box marginTop={1} marginBottom={1}>
          <LintProgressBar linter={linter} />
        </Box>
      </Box>
    </Box>
  )
}
