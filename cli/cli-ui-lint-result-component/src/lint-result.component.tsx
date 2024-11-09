import type { FC }                     from 'react'

import type { LintResultMessageProps } from './lint-result-message.component.js'

import { isAbsolute }                  from 'node:path'
import { relative }                    from 'node:path'

import { Box }                         from 'ink'
import { nanoid }                      from 'nanoid'
import { useMemo }                     from 'react'
import React                           from 'react'

import { LintResultMessage }           from './lint-result-message.component.js'

export interface LintResultProps {
  messages: Array<LintResultMessageProps>
  filePath: string
  source?: string
  cwd?: string
}

export const LintResult: FC<LintResultProps> = ({
  filePath,
  source,
  messages,
  cwd = process.cwd(),
}) => {
  const filepath = useMemo(() => {
    if (isAbsolute(filePath)) {
      return relative(cwd, filePath)
    }

    return filePath
  }, [filePath])

  if (messages.length === 0) {
    return null
  }

  return (
    <Box flexDirection='column' width='100%'>
      {messages.map((message) => (
        <LintResultMessage key={nanoid()} filePath={filepath} message={message} source={source} />
      ))}
    </Box>
  )
}
