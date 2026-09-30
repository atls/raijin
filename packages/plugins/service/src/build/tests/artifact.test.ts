import assert                       from 'node:assert/strict'
import { mkdtemp }                  from 'node:fs/promises'
import { readFile }                 from 'node:fs/promises'
import { writeFile }                from 'node:fs/promises'
import { tmpdir }                   from 'node:os'
import { join }                     from 'node:path'
import test                         from 'node:test'

import { resolveCompletedArtifact } from '../artifact.js'
import { stageArtifact }            from '../artifact.js'

test('commits a complete staged artifact and replaces the previous output', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'service-artifact-'))
  const first = await stageArtifact(cwd)

  await writeFile(join(first.path, 'index.js'), 'first')
  await first.commit()
  await first.dispose()

  const second = await stageArtifact(cwd)

  await writeFile(join(second.path, 'index.js'), 'second')
  const entry = await second.commit()
  await second.dispose()

  assert.equal(await resolveCompletedArtifact(cwd), entry)
  assert.equal(await readFile(entry, 'utf-8'), 'second')
})

test('does not treat an uncommitted artifact as complete', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'service-artifact-'))
  const artifact = await stageArtifact(cwd)

  await writeFile(join(artifact.path, 'index.js'), 'partial')

  assert.equal(await resolveCompletedArtifact(cwd), null)

  await artifact.dispose()
})
