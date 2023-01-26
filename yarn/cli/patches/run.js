const { execSync } = require('child_process')
const { readdirSync } = require('fs')
const { join } = require('path')

const patches = readdirSync(__dirname).filter((name) => name.search(/run\.js/) === -1)

patches.forEach((patch) => execSync(`node ${join(__dirname, patch)}`))
