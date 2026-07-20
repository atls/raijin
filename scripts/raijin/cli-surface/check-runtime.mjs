import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

import { executeRuntime } from './runtime-inventory.mjs'
import { loadRuntimeCliSurface } from './runtime-inventory.mjs'

const [builtRuntimeArgument, checkedRuntimeArgument, docsIndexArgument] = process.argv.slice(2)

if (!builtRuntimeArgument || !checkedRuntimeArgument || !docsIndexArgument) {
  throw new Error('Usage: check-runtime.mjs <built-runtime> <checked-runtime> <docs-index>')
}

const cwd = process.cwd()
const builtRuntimePath = path.resolve(cwd, builtRuntimeArgument)
const checkedRuntimePath = path.resolve(cwd, checkedRuntimeArgument)
const docsIndexPath = path.resolve(cwd, docsIndexArgument)
const builtRuntime = await fs.readFile(builtRuntimePath)
const checkedRuntime = await fs.readFile(checkedRuntimePath)

assert.ok(
  builtRuntime.equals(checkedRuntime),
  `${checkedRuntimeArgument} does not match the deterministic @atls/yarn-cli build`
)

const inventory = await loadRuntimeCliSurface({ cwd, runtimePath: checkedRuntimePath })
const docsIndex = JSON.parse(await fs.readFile(docsIndexPath, 'utf8'))
const inventoryCommands = inventory.commands.map(
  ({ command, description, details, examples, options, pathTokens, plugin, usage }) => ({
    command,
    description,
    ...(details ? { details } : {}),
    examples,
    options,
    pathTokens,
    plugin,
    usage,
  })
)
const documentedCommands = docsIndex.commands
  .map(({ command, description, details, examples, options, pathTokens, plugin, usage }) => ({
    command,
    description,
    ...(details ? { details } : {}),
    examples,
    options,
    pathTokens,
    plugin,
    usage,
  }))
  .sort((left, right) => left.command.localeCompare(right.command))

assert.deepEqual(documentedCommands, inventoryCommands, 'Documented command metadata has drifted')
assert.deepEqual(docsIndex.bundle.plugins, inventory.plugins, 'Documented plugin graph has drifted')

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
