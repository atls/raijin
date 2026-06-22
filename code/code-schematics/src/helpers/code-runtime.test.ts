import assert                            from 'node:assert/strict'
import { access }                        from 'node:fs/promises'
import { mkdtemp }                       from 'node:fs/promises'
import { tmpdir }                        from 'node:os'
import { join }                          from 'node:path'
import { test }                          from 'node:test'

import { SchematicWorkflowException }    from '../exceptions/index.js'
import { getCodeRuntimeCompilerOptions } from './code-runtime.js'
import { writeCodeRuntimeFiles }         from './code-runtime.js'
import { ensureSchematicSucceeded }      from './schematic-result.js'

test('should load code runtime compiler options from local contract', async () => {
  const compilerOptions = await getCodeRuntimeCompilerOptions(process.cwd())

  assert.equal(typeof compilerOptions, 'object')
})

test('should write code runtime files from local generated assets', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'raijin-code-runtime-'))

  await writeCodeRuntimeFiles(process.cwd(), tmpDir)

  await assert.doesNotReject(access(join(tmpDir, 'collection.json')))
})

test('should reject failed schematic exit code', () => {
  assert.throws(() => {
    ensureSchematicSucceeded(1)
  }, SchematicWorkflowException)
})

test('should accept successful schematic exit code', () => {
  assert.doesNotThrow(() => {
    ensureSchematicSucceeded(0)
  })
})
