import assert                         from 'node:assert/strict'
import { access }                     from 'node:fs/promises'
import { mkdir }                      from 'node:fs/promises'
import { mkdtemp }                    from 'node:fs/promises'
import { writeFile }                  from 'node:fs/promises'
import { tmpdir }                     from 'node:os'
import { join }                       from 'node:path'
import { test }                       from 'node:test'

import { SchematicArtifactException } from '../exceptions/index.js'
import { SchematicWorkflowException } from '../exceptions/index.js'
import { getRaijinCompilerOptions }   from './raijin.js'
import { writeRaijinFiles }           from './raijin.js'
import { ensureSchematicSucceeded }   from './schematic-result.js'

test('should load Raijin compiler options from local contract', async () => {
  const compilerOptions = await getRaijinCompilerOptions(process.cwd())

  assert.equal(typeof compilerOptions, 'object')
})

test('should write Raijin files from local schematic artifact', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'raijin-runtime-'))
  const fixtureRepo = await mkdtemp(join(tmpdir(), 'raijin-artifact-repo-'))
  const artifactDir = join(fixtureRepo, 'code/code-schematics/dist/schematic')

  await mkdir(artifactDir, { recursive: true })
  await writeFile(join(artifactDir, 'collection.json'), '{}')

  await writeRaijinFiles(fixtureRepo, tmpDir)

  await assert.doesNotReject(access(join(tmpDir, 'collection.json')))
})

test('should reject missing Raijin schematic artifact', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'raijin-runtime-'))
  const fixtureRepo = await mkdtemp(join(tmpdir(), 'raijin-missing-artifact-repo-'))

  await assert.rejects(writeRaijinFiles(fixtureRepo, tmpDir), SchematicArtifactException)
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
