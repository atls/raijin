import type { Body } from '@atls/logger'
import type { FC }   from 'react'

import { Text }      from 'ink'
import React         from 'react'

const getMessage = (body: Body) => {
  if (typeof body === 'string') {
    return body
  }

  if (typeof body.message === 'string') {
    return body.message
  }

  if (body.stack) {
    return ''
  }

  return JSON.stringify(body)
}

export interface MessageProps {
  children: Body
}

export const LogMessage: FC<MessageProps> = ({ children }) => <Text>{getMessage(children)}</Text>
