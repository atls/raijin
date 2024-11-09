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

export type LintProgressFilesState = 'error' | 'in-progress' | 'success' | 'warning'

export interface LintProgressFilesProps {
  cwd: string
  linter: {
    on(event: 'start', listener: (data: { files: Array<string> }) => void): void
    on(event: 'lint:start', listener: (data: { file: string }) => void): void
    on(
      event: 'lint:end',
      listener: (data: {
        result: { filePath: string; errorCount: number; warningCount: number }
      }) => void
    ): void
    off(event: 'start', listener: (data: { files: Array<string> }) => void): void
    off(event: 'lint:start', listener: (data: { file: string }) => void): void
    off(
      event: 'lint:end',
      listener: (data: {
        result: { filePath: string; errorCount: number; warningCount: number }
      }) => void
    ): void
  }
}

export interface LintProgressFilesIconProps {
  state: LintProgressFilesState
}

export interface LintProgressFilesTextProps {
  state: LintProgressFilesState
  children: string
}

export const LintProgressFilesIcon = ({ state }: LintProgressFilesIconProps): ReactElement => {
  if (state === 'warning') {
    return <Text color='yellow'>{figures.warning}</Text>
  }

  if (state === 'error') {
    return <Text color='red'>{figures.cross}</Text>
  }

  if (state === 'success') {
    return <Text color='green'>{figures.tick}</Text>
  }

  return <Text color='white'>{figures.circleDotted}</Text>
}

export const LintProgressFilesText = ({
  state,
  children,
}: LintProgressFilesTextProps): ReactElement => {
  if (state === 'in-progress') {
    return <Text color='gray'>{children}</Text>
  }

  return <Text color='white'>{children}</Text>
}

export const LintProgressFiles = ({ cwd, linter }: LintProgressFilesProps): ReactElement | null => {
  const [file, setFile] = useState<{ state: LintProgressFilesState; file: string } | undefined>(
    undefined
  )

  const [files, setFiles] = useState<number>(0)
  const [errors, setErrors] = useState<number>(0)
  const [warnings, setWarnings] = useState<number>(0)

  useEffect(() => {
    const onStart = (data: { files: Array<string> }): void => {
      setFiles(data.files.length)
    }

    const onLintStart = (data: { file: string }): void => {
      setFile({ state: 'in-progress', file: relative(cwd, data.file) })
    }

    const onLintEnd = ({
      result,
    }: {
      result: { filePath: string; errorCount: number; warningCount: number }
    }): void => {
      let state: LintProgressFilesState = 'success' as const

      if (result.warningCount > 0) {
        setWarnings((warningCount) => warningCount + result.warningCount)

        state = 'warning'
      }

      if (result.errorCount > 0) {
        setErrors((errorCount) => errorCount + result.errorCount)

        state = 'error'
      }

      setFile({ state, file: relative(cwd, result.filePath) })
    }

    linter.on('start', onStart)
    linter.on('lint:start', onLintStart)
    linter.on('lint:end', onLintEnd)

    return (): void => {
      linter.off('start', onStart)
      linter.off('lint:start', onLintStart)
      linter.off('lint:end', onLintEnd)
    }
  }, [linter, setFile, setFiles, setErrors, setWarnings])

  if (!file) {
    return (
      <Box flexDirection='row'>
        <Badge color='cyan'>Lint:</Badge>
        <Text> </Text>
        <Text color='white'>Loading files...</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection='row' width='100%'>
      <Box flexGrow={1}>
        <Badge color='cyan'>Lint:</Badge>
        <Text> </Text>
        <LintProgressFilesText state={file.state}>{file.file}</LintProgressFilesText>
      </Box>
      <Box flexDirection='row'>
        <Box>
          <LintProgressFilesIcon state={file.state} />
          <Text> </Text>
          <Text color='yellow'>{warnings} Warnings</Text>
          <Text> </Text>
          <Text color='red'>{errors} Errors</Text>
          <Text> </Text>
          <Text color='white'>{files} Files</Text>
          <Text> </Text>
        </Box>
      </Box>
    </Box>
  )
}
