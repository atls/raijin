import assert                         from 'node:assert/strict'
import { access }                     from 'node:fs/promises'
import { mkdtemp }                    from 'node:fs/promises'
import { tmpdir }                     from 'node:os'
import { join }                       from 'node:path'
import { test }                       from 'node:test'

import { SchematicWorkflowException } from '../exceptions/index.js'
import { getRaijinCompilerOptions }   from './raijin.js'
import { writeRaijinFiles }           from './raijin.js'
import { ensureSchematicSucceeded }   from './schematic-result.js'

test('should load Raijin compiler options from local contract', async () => {
  const compilerOptions = await getRaijinCompilerOptions(process.cwd())

  assert.equal(typeof compilerOptions, 'object')
})

test('should write Raijin files from local generated assets', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'raijin-runtime-'))

  await writeRaijinFiles(process.cwd(), tmpDir)

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
