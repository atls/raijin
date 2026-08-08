import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { scenarioNames } from './consumer/scenarios.js'
import { runConsumers } from './consumer/run.js'

const [runtimeArgument, manifestArgument, scenarioArgument, archiveArgument] = process.argv.slice(2)

if (
  !runtimeArgument ||
  !manifestArgument ||
  (scenarioArgument && !scenarioNames.includes(scenarioArgument))
) {
  throw new Error(
    'Usage: consumer.js <runtime-path> <project-manifest> [surface|project-generation] [raijin-archive]'
  )
}

const manifestPath = resolve(process.cwd(), manifestArgument)
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))

if (
  !manifest ||
  typeof manifest !== 'object' ||
  Array.isArray(manifest) ||
  typeof manifest.packageManager !== 'string' ||
  !/^yarn@[^\s]+$/u.test(manifest.packageManager)
) {
  throw new Error(`Project manifest ${manifestPath} must declare a Yarn packageManager`)
}

await runConsumers({
  archivePath: archiveArgument ? resolve(process.cwd(), archiveArgument) : undefined,
  packageManager: manifest.packageManager,
  runtimePath: resolve(process.cwd(), runtimeArgument),
  scenarioName: scenarioArgument,
})
