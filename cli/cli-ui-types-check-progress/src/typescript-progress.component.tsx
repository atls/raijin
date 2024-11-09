import type { ReactElement }                 from 'react'

import type { TypeScriptProgressBarProps }   from './typescript-progress-bar.component.jsx'
import type { TypeScriptProgressFilesProps } from './typescript-progress-files.component.jsx'

import { Box }                               from 'ink'
import { useState }                          from 'react'
import { useEffect }                         from 'react'
import React                                 from 'react'

import { TypeScriptProgressBar }             from './typescript-progress-bar.component.jsx'
import { TypeScriptProgressFiles }           from './typescript-progress-files.component.jsx'

export interface TypeScriptProgressProps {
  typescript: TypeScriptProgressBarProps['typescript'] & TypeScriptProgressFilesProps['typescript']
}

export const TypeScriptProgress = ({
  typescript,
}: TypeScriptProgressProps): ReactElement | null => {
  const [complete, setComplete] = useState<boolean>(false)

  useEffect(() => {
    const onEnd = (): void => {
      setTimeout(() => {
        setComplete(true)
      }, 1000)
    }

    typescript.on('end', onEnd)

    return (): void => {
      typescript.off('end', onEnd)
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
          <TypeScriptProgressFiles typescript={typescript} />
        </Box>
        <Box marginTop={1} marginBottom={1}>
          <TypeScriptProgressBar typescript={typescript} />
        </Box>
      </Box>
    </Box>
  )
}
