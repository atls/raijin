import assert                          from 'node:assert/strict'
import { readFile }                    from 'node:fs/promises'
import test                            from 'node:test'

import { materializeTypeScriptConfig } from './materialize.js'

test('should materialize an isolated TypeScript config', async () => {
  const config = { include: ['**/*'] }
  const path = await materializeTypeScriptConfig({ config, prefix: 'raijin-typescript-' })

  assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), config)
})
