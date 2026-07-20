import { dirname }       from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildProjectSchematicArtifact } from '../../../src/infrastructure/generation/project/schematics/project-schematic-artifact.builder.js'

const packageRoot = dirname(fileURLToPath(import.meta.resolve('@atls/raijin/package.json')))

await buildProjectSchematicArtifact({ packageRoot })
