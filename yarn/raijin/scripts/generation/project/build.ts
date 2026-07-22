import { dirname }       from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildCollection } from '../../../src/infrastructure/generation/project/angular/artifact/build.js'

const packageRoot = dirname(fileURLToPath(import.meta.resolve('@atls/raijin/package.json')))

await buildCollection({ packageRoot })
