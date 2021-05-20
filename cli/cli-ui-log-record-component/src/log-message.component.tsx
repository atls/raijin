import React    from 'react'
import { FC }   from 'react'
import { Text } from 'ink'
import { Body } from '@atls/logger'

const getMessage = (body: Body) => {
  if (typeof body === 'string') {
    return body
  }

  return body.message
}

export interface MessageProps {
  children: Body
}

export const LogMessage: FC<MessageProps> = ({ children }) => <Text>{getMessage(children)}</Text>
