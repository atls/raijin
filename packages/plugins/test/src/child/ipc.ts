import type { TestProducerMessage } from './protocol.js'
import type { TestProducerRequest } from './protocol.js'

import { once }                     from 'node:events'

import { isTestProducerRequest }    from './protocol.js'

export const receiveTestRequest = async (): Promise<TestProducerRequest> => {
  const [message] = await once(process, 'message')

  if (!isTestProducerRequest(message)) {
    throw new Error('Managed test execution received an invalid IPC request')
  }

  return message
}

export const sendTestMessage = async (message: TestProducerMessage): Promise<void> => {
  if (!process.send || !process.connected) {
    throw new Error('Managed test execution IPC channel is unavailable')
  }

  await new Promise<void>((resolveMessage, rejectMessage) => {
    process.send!(message, (error) => {
      if (error) {
        rejectMessage(error)
      } else {
        resolveMessage()
      }
    })
  })
}

export const disconnectTestChild = (): void => {
  if (process.connected) {
    process.disconnect()
  }
}
