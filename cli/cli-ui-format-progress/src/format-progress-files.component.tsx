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

export interface FormatProgressFilesProps {
  cwd: string
  formatter: {
    on(event: 'start', listener: (data: { files: Array<string> }) => void): void
    on(event: 'format:start', listener: (data: { file: string }) => void): void
    on(event: 'format:end', listener: (data: { file: string; changed: boolean }) => void): void
    off(event: 'start', listener: (data: { files: Array<string> }) => void): void
    off(event: 'format:start', listener: (data: { file: string }) => void): void
    off(event: 'format:end', listener: (data: { file: string; changed: boolean }) => void): void
  }
}

export interface FormatProgressFilesIconProps {
  changed: boolean
}

export interface FormatProgressFilesTextProps {
  changed: boolean
  children: string
}

export const FormatProgressFilesIcon = ({
  changed,
}: FormatProgressFilesIconProps): ReactElement => {
  if (changed) {
    return <Text color='green'>{figures.tick}</Text>
  }

  return <Text color='white'>{figures.circleDotted}</Text>
}

export const FormatProgressFilesText = ({
  changed,
  children,
}: FormatProgressFilesTextProps): ReactElement => {
  if (changed) {
    return <Text color='white'>{children}</Text>
  }

  return <Text color='gray'>{children}</Text>
}

export const FormatProgressFiles = ({
  cwd,
  formatter,
}: FormatProgressFilesProps): ReactElement | null => {
  const [file, setFile] = useState<{ changed: boolean; file: string } | undefined>(undefined)

  const [files, setFiles] = useState<number>(0)
  const [formatted, setFormatted] = useState<number>(0)

  useEffect(() => {
    const onStart = (data: { files: Array<string> }): void => {
      setFiles(data.files.length)
    }

    const onFormatStart = (data: { file: string }): void => {
      setFile({ changed: false, file: relative(cwd, data.file) })
    }

    const onFormatEnd = (data: { file: string; changed: boolean }): void => {
      setFile({ changed: data.changed, file: relative(cwd, data.file) })

      if (data.changed) {
        setFormatted((f) => f + 1)
      }
    }

    formatter.on('start', onStart)
    formatter.on('format:start', onFormatStart)
    formatter.on('format:end', onFormatEnd)

    return (): void => {
      formatter.off('start', onStart)
      formatter.off('format:start', onFormatStart)
      formatter.off('format:end', onFormatEnd)
    }
  }, [formatter, setFile, setFiles, setFormatted])

  if (!file) {
    return (
      <Box flexDirection='row'>
        <Badge color='cyan'>Format:</Badge>
        <Text> </Text>
        <Text color='white'>Loading files...</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection='row' width='100%'>
      <Box flexGrow={1}>
        <Badge color='cyan'>Format:</Badge>
        <Text> </Text>
        <FormatProgressFilesText changed={file.changed}>{file.file}</FormatProgressFilesText>
      </Box>
      <Box flexDirection='row'>
        <Box>
          <FormatProgressFilesIcon changed={file.changed} />
          <Text> </Text>
          <Text color='green'>{formatted} Formatted</Text>
          <Text> </Text>
          <Text color='white'>{files} Files</Text>
          <Text> </Text>
        </Box>
      </Box>
    </Box>
  )
}
