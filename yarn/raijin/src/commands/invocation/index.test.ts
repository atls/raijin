import assert                 from 'node:assert/strict'
import test                   from 'node:test'

import * as commandInvocation from './index.js'

test('should keep command invocation internals outside the public facade', () => {
  assert.equal('INVOCATION_CWD_ENV' in commandInvocation, false)
  assert.equal('PROXY_ENV' in commandInvocation, false)
  assert.equal('createProxyEnvironment' in commandInvocation, false)
  assert.equal('proxyProjectCommand' in commandInvocation, false)
  assert.equal('proxyWorkspaceCommand' in commandInvocation, false)
  assert.equal('shouldProxyCommand' in commandInvocation, false)
  assert.equal('createChildProcessOptions' in commandInvocation, false)
  assert.equal('waitForChildProcess' in commandInvocation, false)
  assert.equal('createYarnExecutable' in commandInvocation, false)
  assert.equal('executeYarnCommand' in commandInvocation, false)
  assert.equal('selectPathAdapter' in commandInvocation, false)
})
