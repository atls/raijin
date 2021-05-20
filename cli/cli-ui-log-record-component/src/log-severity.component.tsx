import React    from 'react'
import { FC }   from 'react'
import { Text } from 'ink'

const colors = {
  TRACE: 'gray',
  DEBUG: 'gray',
  INFO: 'blue',
  WARN: 'yellow',
  ERROR: 'red',
  FATAL: 'red',
}

const color = (level) => colors[level] || colors.TRACE

export interface LogLevelProps {
  children: string
}

export const LogSeverity: FC<LogLevelProps> = ({ children }) => (
  <Text color={color(children)} dimColor>
    ●
  </Text>
)
