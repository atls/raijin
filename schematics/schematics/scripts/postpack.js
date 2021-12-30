const { join } = require('path')
const { writeFileSync } = require('fs')

const pkg = require('../package.json')

writeFileSync(
  join(__dirname, '../package.json'),
  JSON.stringify(
    {
      ...pkg,
      schematics: './src/collection.json',
    },
    null,
    2
  )
)
