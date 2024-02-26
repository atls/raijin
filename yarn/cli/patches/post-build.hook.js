import { execSync }    from 'child_process'
import { readdirSync } from 'fs'
import { join }        from 'path'
import { dirname }        from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const patchesDir = join(__dirname, 'post-build')
const patches = readdirSync(patchesDir)

patches.forEach((patch) => execSync(`node ${join(patchesDir, patch)}`))

// eslint-disable-next-line
console.log('Post-build patches applied')
