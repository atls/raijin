import { isAbsolute }               from 'node:path'
import { relative }                 from 'node:path'

import React                        from 'react'
import { Box }                      from 'ink'
import { FC }                       from 'react'
import { useMemo }                  from 'react'

import { ESLintResultMessageProps } from './eslint-result-message.component'
import { ESLintResultMessage }      from './eslint-result-message.component'

export interface ESLintResultProps {
  messages: Array<ESLintResultMessageProps>
  filePath: string
  source?: string
}

export const ESLintResult: FC<ESLintResultProps> = ({ filePath, source, messages }) => {
  const filepath = useMemo(() => {
    if (isAbsolute(filePath)) {
      return relative(process.cwd(), filePath)
    }

    return filePath
  }, [filePath])

  if (messages.length === 0) {
    return null
  }

  return (
    <Box flexDirection='column'>
      {messages.map((message) => (
        <ESLintResultMessage
          key={`${message.ruleId}-${message.line}-${message.column}`}
          filePath={filepath}
          message={message}
          source={source}
        />
      ))}
    </Box>
  )
}
