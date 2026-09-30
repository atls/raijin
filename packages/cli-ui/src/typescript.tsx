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

interface TypeScriptDiagnosticFields {
  code: number
  cwd?: string
}

type TypeScriptCompilerDiagnostic = TypeScriptDiagnosticFields & {
  messageText: DiagnosticMessageChain | string
  file?: SourceFile
  start?: number
}

type TypeScriptStructuredDiagnostic = TypeScriptDiagnosticFields & {
  column?: number
  file?: string
  line?: number
  message: string
  sourceText?: string
}

type TypeScriptDiagnosticProps = TypeScriptCompilerDiagnostic | TypeScriptStructuredDiagnostic

interface TypeScriptDiagnosticView {
  code: number
  column?: number
  cwd: string
  file?: SourceFile | string
  line?: number
  message: string
  sourceText?: string
}

const getFilePath = (file: SourceFile | string | undefined, cwd: string): string | null => {
  if (!file) {
    return null
  }

  const fileName = typeof file === 'string' ? file : file.fileName

  return isAbsolute(fileName) ? relative(cwd, fileName) : fileName
}

const toDiagnosticView = (props: TypeScriptDiagnosticProps): TypeScriptDiagnosticView => {
  const { code, cwd = process.cwd() } = props

  if ('message' in props) {
    const { column, file, line, message, sourceText } = props

    return { code, column, cwd, file, line, message, sourceText }
  }

  const { file, messageText, start } = props
  const position =
    file && start !== undefined ? file.getLineAndCharacterOfPosition(start) : undefined

  return {
    code,
    column: position ? position.character + 1 : undefined,
    cwd,
    file,
    line: position ? position.line + 1 : undefined,
    message: flattenDiagnosticMessageText(messageText, '\n'),
    sourceText: file?.text,
  }
}

export const TypeScriptDiagnostic = (props: TypeScriptDiagnosticProps): ReactElement => {
  const { code, column, cwd, file, line, message, sourceText } = toDiagnosticView(props)
  const filePath = getFilePath(file, cwd)

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
      {sourceText && line !== undefined && (
        <>
          <Box>
            <SourcePreview line={line} column={column}>
              {sourceText}
            </SourcePreview>
          </Box>
          <Separator inset={2} />
        </>
      )}
      <Box marginTop={1} paddingX={2}>
        <Text color='white'>{message}</Text>
      </Box>
    </Box>
  )
}
