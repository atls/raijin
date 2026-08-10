import { dirname }       from 'node:path'
import { join }          from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

export const resolveFixturePath = (name = ''): string => join(directory, name)
