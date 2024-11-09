import type { ReactElement }             from 'react'

import type { FormatProgressBarProps }   from './format-progress-bar.component.jsx'
import type { FormatProgressFilesProps } from './format-progress-files.component.jsx'

import { Box }                           from 'ink'
import { useState }                      from 'react'
import { useEffect }                     from 'react'
import React                             from 'react'

import { FormatProgressBar }             from './format-progress-bar.component.jsx'
import { FormatProgressFiles }           from './format-progress-files.component.jsx'

export interface FormatProgressProps {
  formatter: FormatProgressBarProps['formatter'] & FormatProgressFilesProps['formatter']
  cwd: string
}

export const FormatProgress = ({ cwd, formatter }: FormatProgressProps): ReactElement | null => {
  const [complete, setComplete] = useState<boolean>(false)

  useEffect(() => {
    const onEnd = (): void => {
      setTimeout(() => {
        setComplete(true)
      }, 1)
    }

    formatter.on('end', onEnd)

    return (): void => {
      formatter.off('end', onEnd)
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
          <FormatProgressFiles cwd={cwd} formatter={formatter} />
        </Box>
        <Box marginTop={1} marginBottom={1}>
          <FormatProgressBar formatter={formatter} />
        </Box>
      </Box>
    </Box>
  )
}
