import assert        from 'node:assert/strict'
import { mkdtemp }   from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { tmpdir }    from 'node:os'
import { join }      from 'node:path'
import { test }      from 'node:test'

import { Linter }    from './linter.js'

test('should lint generated eslint config outside tsconfig scope', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-lint-'))

  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(cwd, 'tsconfig.json'), '{"include":["project.types.d.ts"]}\n')
  await writeFile(join(cwd, 'project.types.d.ts'), 'export {}\n')
  await writeFile(join(cwd, '.eslintrc.js'), 'module.exports = {}\n')

  const linter = await Linter.initialize(cwd, cwd)
  const [result] = await linter.lint([join(cwd, '.eslintrc.js')], { cache: true })
  const messages = result.messages.map((message) => message.message).join('\n')

  assert.doesNotMatch(messages, /was not found by the project service/)
})
