import assert           from 'node:assert/strict'
import { mkdir }        from 'node:fs/promises'
import { mkdtemp }      from 'node:fs/promises'
import { readFile }     from 'node:fs/promises'
import { writeFile }    from 'node:fs/promises'
import { tmpdir }       from 'node:os'
import { join }         from 'node:path'
import test             from 'node:test'

import { buildProject } from '../run.js'

const createProject = async (source: string): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'service-build-'))

  await mkdir(join(cwd, 'src'))
  await writeFile(join(cwd, 'package.json'), JSON.stringify({ type: 'module' }))
  await writeFile(join(cwd, 'src/index.ts'), source)

  return cwd
}

test('builds a complete ESM artifact', async () => {
  const cwd = await createProject(`export const value: string = 'ready'\n`)
  const result = await buildProject({ cwd })

  assert.equal(result.status, 'built')

  if (result.status === 'built') {
    assert.match(await readFile(result.entry, 'utf-8'), /ready/)
  }
})

test('preserves the previous complete artifact after a failed build', async () => {
  const cwd = await createProject(`export const value = 'complete'\n`)
  const completed = await buildProject({ cwd })

  assert.equal(completed.status, 'built')

  await writeFile(join(cwd, 'src/index.ts'), 'export const value = {\n')

  const failed = await buildProject({ cwd })

  assert.equal(failed.status, 'build-failed')
  assert.match(await readFile(join(cwd, 'dist/index.js'), 'utf-8'), /complete/)
})
