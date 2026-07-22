import { dirname }       from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildProjectCollection } from '../../../src/infrastructure/generation/project/angular/artifact.js'

const packageRoot = dirname(fileURLToPath(import.meta.resolve('@atls/raijin/package.json')))

await buildProjectCollection({ packageRoot })
