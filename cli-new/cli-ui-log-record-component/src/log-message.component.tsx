import type { Body } from '@atls/logger'

import React         from 'react'
import { Text }      from 'ink'

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

export const LogMessage = ({ children }: MessageProps) => <Text>{getMessage(children)}</Text>
