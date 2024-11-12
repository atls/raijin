import type { FC }                      from 'react'
import type { DiagnosticMessageChain }  from 'typescript'
import type { SourceFile }              from 'typescript'

import { isAbsolute }                   from 'node:path'
import { relative }                     from 'node:path'

import { Text }                         from 'ink'
import { Box }                          from 'ink'
import { useMemo }                      from 'react'
import { flattenDiagnosticMessageText } from 'typescript'
import React                            from 'react'

import { FilePath }                     from '@atls/cli-ui-file-path-component'
import { Line }                         from '@atls/cli-ui-line-component'
import { SourcePreview }                from '@atls/cli-ui-source-preview-component'

export interface TypeScriptDiagnosticProps {
  messageText: DiagnosticMessageChain | string
  file?: SourceFile
  start?: number
  code: number
  cwd?: string
}

export const TypeScriptDiagnostic: FC<TypeScriptDiagnosticProps> = ({
  messageText,
  start,
  file,
  code,
  cwd = process.cwd(),
}) => {
  const filePath = useMemo(() => {
    if (!file) {
      return null
    }

    if (isAbsolute(file.fileName)) {
      return relative(cwd, file.fileName)
    }

    return file.fileName
  }, [file])

  const position = useMemo(() => {
    if (file && start) {
      return file.getLineAndCharacterOfPosition(start)
    }

    return null
  }, [file, start])

  return (
    <Box flexDirection='column' borderStyle='round' borderColor='gray' paddingY={1} width='100%'>
      {!!filePath && (
        <Box flexDirection='row'>
          <Box marginBottom={1} paddingX={2} flexGrow={1}>
            <FilePath line={position ? position.line + 1 : 1} column={position?.character}>
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
      <Line offset={2} />
      {!!file?.text && !!position && (
        <>
          <Box>
            <SourcePreview line={position.line + 1} column={position.character}>
              {file.text}
            </SourcePreview>
          </Box>
          <Line offset={2} />
        </>
      )}
      <Box marginTop={1} paddingX={2}>
        <Text color='white'>{flattenDiagnosticMessageText(messageText, '\n')}</Text>
      </Box>
    </Box>
  )
}
