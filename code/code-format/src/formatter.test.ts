import assert        from 'node:assert/strict'
import { mkdtemp }   from 'node:fs/promises'
import { mkdir }     from 'node:fs/promises'
import { readFile }  from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { tmpdir }    from 'node:os'
import { join }      from 'node:path'
import { test }      from 'node:test'

import { Formatter } from './formatter.js'

const createProject = async (): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-format-'))

  await writeFile(join(cwd, 'package.json'), `${JSON.stringify({ private: true })}\n`)

  return cwd
}

test('should expand explicit directory targets before formatting files', async () => {
  const cwd = await createProject()
  const src = join(cwd, 'src')

  await mkdir(src)
  await writeFile(join(src, 'index.ts'), 'const value={foo:1}\n')

  const formatter = await Formatter.initialize(cwd)

  await formatter.format(['src'])

  assert.equal(await readFile(join(src, 'index.ts'), 'utf8'), 'const value = { foo: 1 }\n')
})

test('should fail clearly when explicit formatter target does not exist', async () => {
  const cwd = await createProject()
  const formatter = await Formatter.initialize(cwd)

  await assert.rejects(
    async () => formatter.format(['missing']),
    new Error('Formatter target does not exist: missing')
  )
})
