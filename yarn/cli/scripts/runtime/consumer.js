import { resolve } from 'node:path'

import { scenarioNames } from './consumer/scenarios.js'
import { runConsumers } from './consumer/run.js'

const [runtimeArgument, packageManager, scenarioArgument, archiveArgument] = process.argv.slice(2)

if (
  !runtimeArgument ||
  !packageManager ||
  (scenarioArgument && !scenarioNames.includes(scenarioArgument))
) {
  throw new Error(
    'Usage: consumer.js <runtime-path> <package-manager> [surface|project-generation] [raijin-archive]'
  )
}

await runConsumers({
  archivePath: archiveArgument ? resolve(process.cwd(), archiveArgument) : undefined,
  packageManager,
  runtimePath: resolve(process.cwd(), runtimeArgument),
  scenarioName: scenarioArgument,
})
