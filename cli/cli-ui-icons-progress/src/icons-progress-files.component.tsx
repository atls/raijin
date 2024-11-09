/* eslint-disable @typescript-eslint/method-signature-style */

import type { ReactElement } from 'react'

import { Badge }             from '@inkjs/ui'
import { Box }               from 'ink'
import { Text }              from 'ink'
import { useEffect }         from 'react'
import { useState }          from 'react'
import React                 from 'react'
import figures               from 'figures'

export interface IconsProgressFilesProps {
  icons: {
    on(event: 'read:start' | 'save:start' | 'transform:start', listener: () => void): void
    off(event: 'read:start' | 'save:start' | 'transform:start', listener: () => void): void
  }
}

export const IconsProgressFiles = ({ icons }: IconsProgressFilesProps): ReactElement | null => {
  const [state, setState] = useState<string>('Initilization...')

  useEffect(() => {
    const onRead = (): void => {
      setState('Reading files...')
    }

    const onTransform = (): void => {
      setState('Transforming files...')
    }

    const onSave = (): void => {
      setState('Saving files...')
    }

    icons.on('read:start', onRead)
    icons.on('transform:start', onTransform)
    icons.on('save:start', onSave)

    return (): void => {
      icons.off('read:start', onRead)
      icons.off('transform:start', onTransform)
      icons.off('save:start', onSave)
    }
  }, [icons, setState])

  return (
    <Box flexDirection='row' width='100%'>
      <Box flexGrow={1}>
        <Badge color='cyan'>Icons:</Badge>
        <Text> </Text>
        <Text color='white'>{state}</Text>
      </Box>
      <Box flexDirection='row'>
        <Text color='green'>{figures.tick}</Text>
      </Box>
    </Box>
  )
}
