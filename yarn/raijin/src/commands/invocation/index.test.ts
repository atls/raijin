import assert                 from 'node:assert/strict'
import test                   from 'node:test'

import * as commandInvocation from './index.js'

test('should keep command invocation internals outside the public facade', () => {
  assert.equal('INVOCATION_CWD_ENV' in commandInvocation, false)
  assert.equal('PROXY_ENV' in commandInvocation, false)
  assert.equal('createProxyEnvironment' in commandInvocation, false)
  assert.equal('selectPathAdapter' in commandInvocation, false)
})
