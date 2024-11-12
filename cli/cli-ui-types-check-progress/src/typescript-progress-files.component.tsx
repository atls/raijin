/* eslint-disable @typescript-eslint/method-signature-style */

import type { ReactElement } from 'react'

import { Badge }             from '@inkjs/ui'
import { Box }               from 'ink'
import { Text }              from 'ink'
import { useEffect }         from 'react'
import { useState }          from 'react'
import React                 from 'react'
import figures               from 'figures'

export interface TypeScriptProgressFilesProps {
  typescript: {
    on(event: 'start', listener: (data: { files: Array<string> }) => void): void
    off(event: 'start', listener: (data: { files: Array<string> }) => void): void
  }
}

export const TypeScriptProgressFiles = ({
  typescript,
}: TypeScriptProgressFilesProps): ReactElement | null => {
  const [files, setFiles] = useState<number>(0)

  useEffect(() => {
    const onStart = (data: { files: Array<string> }): void => {
      setFiles(data.files.length)
    }

    typescript.on('start', onStart)

    return (): void => {
      typescript.off('start', onStart)
    }
  }, [typescript, setFiles])

  if (files === 0) {
    return (
      <Box flexDirection='row'>
        <Badge color='cyan'>TypeScript:</Badge>
        <Text> </Text>
        <Text color='white'>Loading files...</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection='row' width='100%'>
      <Box flexGrow={1}>
        <Badge color='cyan'>TypeScript:</Badge>
        <Text> </Text>
        <Text color='white'>Processing...</Text>
      </Box>
      <Box flexDirection='row'>
        <Box>
          <Text color='green'>{figures.tick}</Text>
          <Text> </Text>
          <Text color='white'>{files} Files</Text>
          <Text> </Text>
        </Box>
      </Box>
    </Box>
  )
}
