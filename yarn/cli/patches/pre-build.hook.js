import { fileURLToPath } from 'url'
import { execSync }      from 'child_process'
import { readdirSync }   from 'fs'
import { dirname }       from 'path'
import { join }          from 'path'


const __dirname = dirname(fileURLToPath(import.meta.url))


const patchesDir = join(__dirname, 'pre-build')
const patches = readdirSync(patchesDir)

patches.forEach((patch) => execSync(`node ${join(patchesDir, patch)}`))

// eslint-disable-next-line
console.log('Pre-build patches applied')
