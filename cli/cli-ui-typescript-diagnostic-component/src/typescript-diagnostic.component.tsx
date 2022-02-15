import { isAbsolute }                    from 'node:path'
import { relative }                      from 'node:path'

import type { DiagnosticMessageChain }   from 'typescript'
import type { SourceFile }               from 'typescript'

import React                             from 'react'
import { Text }                          from 'ink'
import { Box }                           from 'ink'
import { FC }                            from 'react'
import { useMemo }                       from 'react'

import { SourcePreview }                 from '@atls/cli-ui-source-component'
import { getLineAndCharacterOfPosition } from '@atls/code-typescript'
import { flattenDiagnosticMessageText }  from '@atls/code-typescript'

export interface TypeScriptDiagnosticProps {
  file?: SourceFile | any
  messageText: string | DiagnosticMessageChain
  start?: number
}

export const TypeScriptDiagnostic: FC<TypeScriptDiagnosticProps> = ({
  start,
  file,
  messageText,
}) => {
  const filepath = useMemo(() => {
    if (!file) {
      return null
    }

    if (isAbsolute(file.fileName)) {
      return relative(process.cwd(), file?.fileName)
    }

    return file.fileName
  }, [file])

  const position = useMemo(() => {
    if (file?.lineMap && start) {
      return getLineAndCharacterOfPosition(file, start!)
    }

    return null
  }, [file, start])

  return (
    <Box flexDirection='column' marginBottom={1}>
      {filepath && (
        <Box marginBottom={1}>
          <Text color='cyan'>
            {filepath}
            {position && (
              <Text color='yellow'>
                :{position.line + 1}:{position.character}
              </Text>
            )}
          </Text>
        </Box>
      )}
      <Box marginBottom={1} marginLeft={2}>
        <Text bold color='red'>
          Error
        </Text>
        <Text color='white'>: {flattenDiagnosticMessageText(messageText, '\n')}</Text>
      </Box>
      {file?.text && position && (
        <Box marginBottom={1}>
          <SourcePreview line={position.line + 1} column={position.character}>
            {file.text}
          </SourcePreview>
        </Box>
      )}
    </Box>
  )
}
