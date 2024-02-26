import { join }          from 'path'
import { writeFileSync } from 'fs'
import pkg               from '../package.json'

writeFileSync(
  join(__dirname, '../package.json'),
  JSON.stringify(
    {
      ...pkg,
      schematics: './src/collection.json',
    },
    null,
    2,
  ),
)
