import React    from 'react'
import { Text } from 'ink'

export interface NamespaceProps {
  children: string
}

export const LogNamespace = ({ children }: NamespaceProps) => (
  <Text color='#d75f00'>{children}</Text>
)
