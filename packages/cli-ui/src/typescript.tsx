import type { ReactElement }            from 'react'
import type { DiagnosticMessageChain }  from 'typescript'
import type { SourceFile }              from 'typescript'

import { isAbsolute }                   from 'node:path'
import { relative }                     from 'node:path'

import { Box }                          from 'ink'
import { Text }                         from 'ink'
import { flattenDiagnosticMessageText } from 'typescript'
import React                            from 'react'

import { FilePath }                     from './location.js'
import { Separator }                    from './separator.js'
import { SourcePreview }                from './source.js'

interface TypeScriptDiagnosticProps {
  messageText: DiagnosticMessageChain | string
  file?: SourceFile
  start?: number
  code: number
  cwd?: string
}

const getFilePath = (file: SourceFile | undefined, cwd: string): string | null => {
  if (!file) {
    return null
  }

  return isAbsolute(file.fileName) ? relative(cwd, file.fileName) : file.fileName
}

export const TypeScriptDiagnostic = ({
  messageText,
  start,
  file,
  code,
  cwd = process.cwd(),
}: TypeScriptDiagnosticProps): ReactElement => {
  const filePath = getFilePath(file, cwd)
  const position = file && start !== undefined ? file.getLineAndCharacterOfPosition(start) : null
  const line = position ? position.line + 1 : undefined
  const column = position ? position.character + 1 : undefined

  return (
    <Box flexDirection='column' borderStyle='round' borderColor='gray' paddingY={1} width='100%'>
      {filePath && (
        <Box flexDirection='row'>
          <Box marginBottom={1} paddingX={2} flexGrow={1}>
            <FilePath line={line} column={column}>
              {filePath}
            </FilePath>
          </Box>
          <Box paddingX={2}>
            <Text bold color='red'>
              TS{code}
            </Text>
          </Box>
        </Box>
      )}
      <Separator inset={2} />
      {file?.text && position && line !== undefined && (
        <>
          <Box>
            <SourcePreview line={line} column={column}>
              {file.text}
            </SourcePreview>
          </Box>
          <Separator inset={2} />
        </>
      )}
      <Box marginTop={1} paddingX={2}>
        <Text color='white'>{flattenDiagnosticMessageText(messageText, '\n')}</Text>
      </Box>
    </Box>
  )
}
