import { dirname }       from 'node:path'
import { join }          from 'node:path'
import { fileURLToPath } from 'node:url'

export const directory = dirname(fileURLToPath(import.meta.url))
export const program = join(directory, 'program.ts')
