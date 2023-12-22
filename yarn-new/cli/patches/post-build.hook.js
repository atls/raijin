const { execSync } = require('child_process')
const { readdirSync } = require('fs')
const { join } = require('path')

const patchesDir = join(__dirname, 'post-build')
const patches = readdirSync(patchesDir)

patches.forEach((patch) => execSync(`node ${join(patchesDir, patch)}`))

// eslint-disable-next-line
console.log('Post-build patches applied')
