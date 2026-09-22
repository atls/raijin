import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

import { executeRuntime } from './runtime-inventory.js'
import { loadRuntimeCliSurface } from './runtime-inventory.js'

const [builtRuntimeArgument, checkedRuntimeArgument, assemblyManifestArgument] =
  process.argv.slice(2)

if (!builtRuntimeArgument || !checkedRuntimeArgument || !assemblyManifestArgument) {
  throw new Error('Usage: check-runtime.mjs <built-runtime> <checked-runtime> <assembly-manifest>')
}

const cwd = process.cwd()
const builtRuntimePath = path.resolve(cwd, builtRuntimeArgument)
const checkedRuntimePath = path.resolve(cwd, checkedRuntimeArgument)
const assemblyManifestPath = path.resolve(cwd, assemblyManifestArgument)
const builtRuntime = await fs.readFile(builtRuntimePath)
const checkedRuntime = await fs.readFile(checkedRuntimePath)

assert.ok(
  builtRuntime.equals(checkedRuntime),
  `${checkedRuntimeArgument} does not match the deterministic @atls/raijin-assembly build`
)

const inventory = await loadRuntimeCliSurface({ cwd, runtimePath: checkedRuntimePath })
const assemblyManifest = JSON.parse(await fs.readFile(assemblyManifestPath, 'utf8'))
const configuredPlugins = assemblyManifest['@yarnpkg/builder']?.bundles?.standard

assert.ok(
  Array.isArray(configuredPlugins),
  'Assembly manifest is missing the standard plugin bundle'
)
assert.deepEqual(
  inventory.plugins,
  [...configuredPlugins].sort((left, right) => left.localeCompare(right)),
  'Checked runtime plugin graph has drifted from the assembly manifest'
)

const generalHelp = await executeRuntime({
  args: ['--help'],
  cwd,
  runtimePath: checkedRuntimePath,
})

for (const command of inventory.commands) {
  const helpCommand = `  yarn ${command.command}`
  const generalHelpContainsCommand = generalHelp
    .split('\n')
    .some((line) => line === helpCommand || line.startsWith(`${helpCommand} `))

  assert.ok(generalHelpContainsCommand, `General help omits "${command.command}"`)

  // Keep the runtime proof bounded: each invocation loads the complete checked bundle.
  // eslint-disable-next-line no-await-in-loop
  await executeRuntime({
    args: [...command.pathTokens, '--help'],
    cwd,
    runtimePath: checkedRuntimePath,
  })
}

// eslint-disable-next-line no-console
console.log(
  `CLI surface check passed (${inventory.commands.length} commands, ${inventory.plugins.length} plugins)`
)
