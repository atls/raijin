import type { ReactElement }            from 'react'

import type { IconsProgressBarProps }   from './icons-progress-bar.component.js'
import type { IconsProgressFilesProps } from './icons-progress-files.component.js'

import { Box }                          from 'ink'
import { useState }                     from 'react'
import { useEffect }                    from 'react'
import React                            from 'react'

import { IconsProgressBar }             from './icons-progress-bar.component.js'
import { IconsProgressFiles }           from './icons-progress-files.component.js'

export interface IconsProgressProps {
  icons: IconsProgressBarProps['icons'] & IconsProgressFilesProps['icons']
}

export const IconsProgress = ({ icons }: IconsProgressProps): ReactElement | null => {
  const [complete, setComplete] = useState<boolean>(false)

  useEffect(() => {
    const onEnd = (): void => {
      setTimeout(() => {
        setComplete(true)
      }, 1)
    }

    icons.on('save:end', onEnd)

    return (): void => {
      icons.off('save:end', onEnd)
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
          <IconsProgressFiles icons={icons} />
        </Box>
        <Box marginTop={1} marginBottom={1}>
          <IconsProgressBar icons={icons} />
        </Box>
      </Box>
    </Box>
  )
}
