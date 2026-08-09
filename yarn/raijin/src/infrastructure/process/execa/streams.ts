import type { Readable } from 'node:stream'
import type { Writable } from 'node:stream'

export interface Streams {
  stderr: Writable | 'inherit'
  stdin: Readable | 'inherit'
  stdout: Writable | 'inherit'
}
