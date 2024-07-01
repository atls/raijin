import type { FC } from 'react'

import { Text }    from 'ink'
import React       from 'react'

export interface NamespaceProps {
  children: string
}

export const LogNamespace: FC<NamespaceProps> = ({ children }) => (
  <Text color='#d75f00'>{children}</Text>
)
