/* eslint-disable no-console */

import type { DryRunEvent } from '@angular-devkit/schematics'

export const reportProjectGenerationEvent = (event: DryRunEvent): void => {
  switch (event.kind) {
    case 'error':
      console.error(
        `ERROR! ${event.path} ${
          event.description === 'alreadyExist' ? 'already exists' : 'does not exist'
        }.`
      )
      break
    case 'update':
      console.debug(`UPDATE ${event.path} (${event.content.length} bytes)`)
      break
    case 'create':
      console.debug(`CREATE ${event.path} (${event.content.length} bytes)`)
      break
    case 'delete':
      console.debug(`DELETE ${event.path}`)
      break
    case 'rename':
      console.debug(`RENAME ${event.path} => ${event.to}`)
      break
    default:
      break
  }
}
