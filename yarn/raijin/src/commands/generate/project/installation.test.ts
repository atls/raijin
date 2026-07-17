import assert                               from 'node:assert/strict'
import { mkdir }                            from 'node:fs/promises'
import { mkdtemp }                          from 'node:fs/promises'
import { readFile }                         from 'node:fs/promises'
import { writeFile }                        from 'node:fs/promises'
import { tmpdir }                           from 'node:os'
import { join }                             from 'node:path'
import { test }                             from 'node:test'

import { installProjectGenerationArtifact } from './installation.js'

const createProjectGenerationArtifact = async (root: string): Promise<void> => {
  await mkdir(join(root, 'project'), { recursive: true })
  await writeFile(join(root, 'collection.json'), '{"schematics":{}}\n')
  await writeFile(join(root, 'project/project.factory.cjs'), 'module.exports = () => undefined\n')
}

test('should install project generation artifact next to runtime', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-project-install-'))
  const artifactDir = await mkdtemp(join(tmpdir(), 'raijin-project-artifact-'))

  await createProjectGenerationArtifact(artifactDir)
  await installProjectGenerationArtifact(cwd, artifactDir)

  assert.equal(
    await readFile(join(cwd, '.yarn/schematic/collection.json'), 'utf-8'),
    '{"schematics":{}}\n'
  )
  assert.equal(
    await readFile(join(cwd, '.yarn/schematic/project/project.factory.cjs'), 'utf-8'),
    'module.exports = () => undefined\n'
  )
})

test('should replace stale project generation artifact', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-project-install-'))
  const artifactDir = await mkdtemp(join(tmpdir(), 'raijin-project-artifact-'))

  await mkdir(join(cwd, '.yarn/schematic/project'), { recursive: true })
  await writeFile(join(cwd, '.yarn/schematic/project/project.factory.cjs'), 'stale\n')

  await createProjectGenerationArtifact(artifactDir)
  await installProjectGenerationArtifact(cwd, artifactDir)

  assert.equal(
    await readFile(join(cwd, '.yarn/schematic/project/project.factory.cjs'), 'utf-8'),
    'module.exports = () => undefined\n'
  )
})
