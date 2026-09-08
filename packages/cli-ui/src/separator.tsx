import type { ReactElement } from 'react'

import { Text }              from 'ink'
import { useStdout }         from 'ink'
import React                 from 'react'

const DEFAULT_COLUMNS = 80

interface SeparatorProps {
  inset?: number
}

export const Separator = ({ inset = 0 }: SeparatorProps): ReactElement => {
  const { stdout } = useStdout()
  const columns = Math.max(0, (stdout?.columns || DEFAULT_COLUMNS) - inset)

  return <Text color='gray'>{'─'.repeat(columns)}</Text>
}
