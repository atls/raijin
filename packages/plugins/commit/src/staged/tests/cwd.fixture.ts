import type { Plugin }               from '@yarnpkg/core'
import type { PluginConfiguration }  from '@yarnpkg/core'

import assert                        from 'node:assert/strict'

import { runExit }                   from '@yarnpkg/cli'
import { npath }                     from '@yarnpkg/fslib'

import { composeCommandInvocations } from '@atls/raijin/commands'
import { defineCommandInvocations }  from '@atls/raijin/commands'

import { CommitStagedCommand }       from '../command.js'

const originalCwd = process.cwd()
const plugin: Plugin = {
  commands: defineCommandInvocations({ entry: [CommitStagedCommand] }),
}
const configuration: PluginConfiguration = {
  modules: new Map([['@atls/yarn-plugin-commit', plugin]]),
  plugins: new Set(['@atls/yarn-plugin-commit']),
}

await runExit(process.argv.slice(2), {
  cwd: npath.toPortablePath(originalCwd),
  selfPath: null,
  pluginConfiguration: composeCommandInvocations(configuration),
})

assert.equal(process.cwd(), originalCwd)
process.stdout.write('\nSTAGED_CWD_RESTORED\n')
