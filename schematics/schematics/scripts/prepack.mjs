import copydir from 'copy-dir'
import globby from 'globby'
import { join } from 'path'
import { copyFileSync } from 'node:fs'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import pkg from '../package.json' assert { type: 'json' }

const dirname = fileURLToPath(new URL('.', import.meta.url))

globby
  .sync('**/*.json', { cwd: join(dirname, '../src') })
  // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
  .map((file) => copyFileSync(join('src', file), join('dist', file)))

globby
  .sync('*/files', { onlyFiles: false, cwd: join(dirname, '../src') })
  .map((files) => copydir.sync(join('src', files), join('dist', files)))

writeFileSync(
  join(dirname, '../package.json'),
  JSON.stringify(
    {
      ...pkg,
      schematics: './dist/collection.json',
    },
    null,
    2
  )
)
