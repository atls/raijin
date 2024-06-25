import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import pkg from '../package.json' assert { type: 'json' }

writeFileSync(
  join(fileURLToPath(new URL('.', import.meta.url)), '../package.json'),
  JSON.stringify(
    {
      ...pkg,
      schematics: './src/collection.json',
    },
    null,
    2
  )
)
