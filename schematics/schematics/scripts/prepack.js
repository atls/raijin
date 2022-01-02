const copydir = require('copy-dir')
const globby = require('globby')
const { join } = require('path')
const { copyFileSync } = require('fs')
const { writeFileSync } = require('fs')

const pkg = require('../package.json')

globby
  .sync('**/*.json', { cwd: join(__dirname, '../src') })
  .map((file) => copyFileSync(join('src', file), join('dist', file)))

globby
  .sync('*/files', { onlyFiles: false, cwd: join(__dirname, '../src') })
  .map((files) => copydir.sync(join('src', files), join('dist', files)))

writeFileSync(
  join(__dirname, '../package.json'),
  JSON.stringify(
    {
      ...pkg,
      schematics: './dist/collection.json',
    },
    null,
    2
  )
)
