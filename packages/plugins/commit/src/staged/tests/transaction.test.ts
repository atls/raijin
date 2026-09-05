import assert               from 'node:assert/strict'
import { copyFile }         from 'node:fs/promises'
import { readFile }         from 'node:fs/promises'
import { rename }           from 'node:fs/promises'
import { rm }               from 'node:fs/promises'
import { writeFile }        from 'node:fs/promises'
import { join }             from 'node:path'
import { test }             from 'node:test'

import { createRepository } from './repository.fixture.js'
import { git }              from './repository.fixture.js'
import { run }              from './repository.fixture.js'

test('runs a single root configuration and preserves declared task ordering', async (t) => {
  const cwd = await createRepository(t)

  await rm(join(cwd, 'client', '.lintstagedrc.json'))
  await copyFile(new URL('./verified.fixture.mjs', import.meta.url), join(cwd, 'verified.mjs'))
  await writeFile(
    join(cwd, '.lintstagedrc.json'),
    JSON.stringify({
      '*.txt': ['node check.mjs backend', 'node verified.mjs'],
    })
  )
  await writeFile(join(cwd, 'file with spaces.txt'), 'unformatted staged\n')
  await git(cwd, 'add', '--all')

  const result = await run(cwd)

  assert.equal(result.code, 0, result.output)
  assert.equal(await git(cwd, 'show', ':file with spaces.txt'), 'formatted staged\n')
})

for (const owners of [['backend'], ['client'], ['backend', 'client']]) {
  test(`uses nearest project configuration for ${owners.join(' and ')}`, async (t) => {
    const cwd = await createRepository(t)
    const files = owners.map((owner) =>
      join(owner === 'backend' ? '' : 'client', 'file with spaces.txt'))

    await Promise.all(
      files.map(async (file) => {
        await writeFile(join(cwd, file), 'unformatted staged\n')
      })
    )

    await git(cwd, 'add', '--', ...files)
    await writeFile(join(cwd, 'unrelated.txt'), 'UNSTAGED unrelated\n')

    const result = await run(cwd)

    assert.equal(result.code, 0, result.output)

    const checks = (await readFile(join(cwd, '.checks.jsonl'), 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { owner: string; files: Array<string> })

    assert.deepEqual(checks.map(({ owner }) => owner).sort(), owners.toSorted())
    assert.deepEqual(
      checks.flatMap(({ files: checked }) => checked).sort(),
      files.map((file) => join(cwd, file)).sort()
    )

    await Promise.all(
      files.map(async (file) => {
        assert.equal(await git(cwd, 'show', `:${file}`), 'formatted staged\n')
        assert.equal(await readFile(join(cwd, file), 'utf8'), 'formatted staged\n')
      })
    )

    assert.equal(await git(cwd, 'show', ':unrelated.txt'), 'initial unrelated\n')
    assert.equal(await readFile(join(cwd, 'unrelated.txt'), 'utf8'), 'UNSTAGED unrelated\n')
    assert.equal(await git(cwd, 'stash', 'list'), '')
  })
}

test('preserves partial staging, renames, deletions, and an unrelated index entry', async (t) => {
  const cwd = await createRepository(t)
  const file = 'file with spaces.txt'
  const renamed = 'client/renamed with spaces.txt'

  await writeFile(join(cwd, file), 'unformatted staged\n\n\n\n\n\n\n\n\n\nend\n')
  await git(cwd, 'add', '--', file)
  await writeFile(join(cwd, file), 'unformatted staged\n\n\n\n\n\n\n\n\n\nUNSTAGED end\n')
  await rename(join(cwd, 'client', file), join(cwd, renamed))
  await git(cwd, 'add', '--', 'client')
  await git(cwd, 'rm', '--', 'unrelated.txt')
  await writeFile(join(cwd, 'note.bin'), 'separately staged\n')
  await git(cwd, 'add', '--', 'note.bin')

  const result = await run(cwd)

  assert.equal(result.code, 0, result.output)
  assert.equal(await git(cwd, 'show', `:${file}`), 'formatted staged\n\n\n\n\n\n\n\n\n\nend\n')
  assert.match(await readFile(join(cwd, file), 'utf8'), /UNSTAGED end/)
  assert.equal(await git(cwd, 'show', ':note.bin'), 'separately staged\n')
  assert.equal(await git(cwd, 'show', `:${renamed}`), 'initial\n')
  assert.match(
    await git(cwd, 'diff', '--cached', '--name-status'),
    /R100\tclient\/file with spaces.txt\tclient\/renamed with spaces.txt/
  )
  assert.match(await git(cwd, 'diff', '--cached', '--name-status'), /D\tunrelated.txt/)
  assert.equal(await git(cwd, 'stash', 'list'), '')
})

for (const owner of ['backend', 'client']) {
  test(`rolls back the whole mixed transaction on a real ${owner} check failure`, async (t) => {
    const cwd = await createRepository(t)

    await Promise.all(
      [
        ['', 'backend'],
        ['client', 'client'],
      ].map(async ([directory, project]) => {
        await writeFile(
          join(cwd, directory, 'file with spaces.txt'),
          project === owner ? 'INVALID staged\n' : 'unformatted staged\n'
        )
      })
    )

    await git(cwd, 'add', '--', '*.txt', 'client')
    await writeFile(join(cwd, 'unrelated.txt'), 'UNSTAGED unrelated\n')
    const index = await git(cwd, 'diff', '--cached', '--binary')
    const working = await git(cwd, 'diff', '--binary')
    const result = await run(cwd)

    assert.equal(result.code, 1, result.output)
    assert.match(result.output, /INVALID/)
    assert.equal(await git(cwd, 'diff', '--cached', '--binary'), index)
    assert.equal(await git(cwd, 'diff', '--binary'), working)
    assert.equal(await git(cwd, 'stash', 'list'), '')
  })
}

test('fails when configuration or a configured required command is missing', async (t) => {
  const cwd = await createRepository(t)

  await writeFile(
    join(cwd, 'client', '.lintstagedrc.json'),
    JSON.stringify({ '*.txt': 'raijin-fixture-command-that-does-not-exist' })
  )
  await writeFile(join(cwd, 'client', 'file with spaces.txt'), 'staged\n')
  await git(cwd, 'add', '--', 'client')

  const unsupported = await run(cwd)

  assert.equal(unsupported.code, 1, unsupported.output)
  assert.match(unsupported.output, /ENOENT/)

  await rm(join(cwd, '.lintstagedrc.json'))
  await rm(join(cwd, 'client', '.lintstagedrc.json'))
  await git(cwd, 'add', '--all')

  const missing = await run(cwd)

  assert.equal(missing.code, 1, missing.output)
  assert.match(missing.output, /No valid configuration/i)
})

test('maps a provider failure outside a Git repository to a non-zero command exit', async (t) => {
  const cwd = await createRepository(t)

  await rm(join(cwd, '.git'), { recursive: true })

  const result = await run(cwd)

  assert.equal(result.code, 1, result.output)
  assert.match(result.output, /git|repository/i)
})

test('reports invalid provider configuration instead of converting it into success', async (t) => {
  const cwd = await createRepository(t)

  await writeFile(join(cwd, '.lintstagedrc.json'), JSON.stringify({ '*.txt': null }))
  await writeFile(join(cwd, 'file with spaces.txt'), 'staged\n')
  await git(cwd, 'add', '--all')

  const result = await run(cwd)

  assert.equal(result.code, 1, result.output)
  assert.match(result.output, /Invalid value|Invalid configuration/i)
})

test('lets the provider chunk large sets of literal paths without losing arguments', async (t) => {
  const cwd = await createRepository(t)
  const files = Array.from({ length: 800 }, (_, index) =>
    join('client', `${index} ${'long path '.repeat(18)}[literal].txt`))

  await Promise.all(
    files.map(async (file) => {
      await writeFile(join(cwd, file), 'unformatted staged\n')
    })
  )

  await git(cwd, 'add', '--all')

  const result = await run(cwd)

  assert.equal(result.code, 0, result.output)

  const checks = (await readFile(join(cwd, '.checks.jsonl'), 'utf8'))
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as { files: Array<string> })

  assert.ok(checks.length > 1)
  assert.deepEqual(
    checks.flatMap(({ files: checked }) => checked).sort(),
    files.map((file) => join(cwd, file)).sort()
  )
  assert.doesNotMatch(await git(cwd, 'diff', '--cached'), /\+unformatted/)
  assert.equal(await git(cwd, 'diff'), '')
  assert.equal(await git(cwd, 'stash', 'list'), '')
})
