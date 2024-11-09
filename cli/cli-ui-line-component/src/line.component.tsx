import type { ReactElement } from 'react'

import { Text }              from 'ink'
import React                 from 'react'

export const Line = ({ offset = 0 }: { offset?: number }): ReactElement => (
  <Text color='gray'>
    {Array.from({ length: process.stdout.columns - offset }, () => '─').join('')}
  </Text>
)
