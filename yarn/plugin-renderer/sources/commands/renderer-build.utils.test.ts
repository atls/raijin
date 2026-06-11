import assert                          from 'node:assert/strict'
import test                            from 'node:test'

import { assertRendererBuildExitCode } from './renderer-build.utils.js'
import { createRendererBuildEnv }      from './renderer-build.utils.js'

test('should disable Next telemetry for renderer build', () => {
  const env = createRendererBuildEnv({
    NEXT_TELEMETRY_DISABLED: '0',
    NODE_ENV: 'production',
  })

  assert.equal(env.NEXT_TELEMETRY_DISABLED, '1')
  assert.equal(env.NODE_ENV, 'production')
})

test('should accept successful renderer build exit code', () => {
  assert.doesNotThrow(() => {
    assertRendererBuildExitCode(0)
  })
})

test('should reject failed renderer build exit code', () => {
  assert.throws(() => {
    assertRendererBuildExitCode(1)
  }, /Renderer build failed with exit code 1/)
})
