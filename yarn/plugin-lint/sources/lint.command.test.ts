import assert                     from 'node:assert/strict'
import { resolve }                from 'node:path'
import test                       from 'node:test'

import { resolveLintTargetFiles } from './lint.command.js'

test('should resolve lint targets from the native invocation cwd', () => {
  const invocationCwd = '/repo/client' as never
  const absoluteTarget = resolve('/repo/shared/index.ts')

  assert.deepEqual(resolveLintTargetFiles(['src/index.ts', absoluteTarget], invocationCwd), [
    resolve('/repo/client/src/index.ts'),
    absoluteTarget,
  ])
})
