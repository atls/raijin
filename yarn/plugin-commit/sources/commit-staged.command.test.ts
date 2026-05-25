import assert           from 'node:assert/strict'
import { test }         from 'node:test'

import { createConfig } from './commit-staged.command.js'

test('should run lint-staged tasks through current yarn command', () => {
  const yarnCommandPath = '/workspace/package/.config/yarn-remote.mjs'
  const config = createConfig(yarnCommandPath) as Record<string, unknown>
  const serializedConfig = JSON.stringify(config)

  assert.equal(config['*.{ts,tsx}'], `"${yarnCommandPath}" typecheck`)
  assert.equal(config['*.{test,spec}.{ts,tsx}'], `"${yarnCommandPath}" test unit`)
  assert.doesNotMatch(serializedConfig, /\.yarn\/bin\/yarn/)
})
