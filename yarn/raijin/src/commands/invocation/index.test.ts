import assert                 from 'node:assert/strict'
import test                   from 'node:test'

import * as commandInvocation from './index.js'

test('should keep command invocation internals outside the public facade', () => {
  assert.equal('COMMAND_INVOCATION_CWD' in commandInvocation, false)
  assert.equal('COMMAND_PROXY_EXECUTION' in commandInvocation, false)
  assert.equal('createCommandProxyEnvironment' in commandInvocation, false)
  assert.equal('createCommandPath' in commandInvocation, false)
  assert.equal('resolveCommandPlatformAdapter' in commandInvocation, false)
})
