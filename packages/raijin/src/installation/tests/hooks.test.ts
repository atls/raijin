import assert                     from 'node:assert/strict'
import { execFile }               from 'node:child_process'
import { constants }              from 'node:fs'
import { access }                 from 'node:fs/promises'
import { mkdir }                  from 'node:fs/promises'
import { mkdtemp }                from 'node:fs/promises'
import { readFile }               from 'node:fs/promises'
import { rm }                     from 'node:fs/promises'
import { symlink }                from 'node:fs/promises'
import { writeFile }              from 'node:fs/promises'
import { tmpdir }                 from 'node:os'
import { basename }               from 'node:path'
import { dirname }                from 'node:path'
import { delimiter }              from 'node:path'
import { join }                   from 'node:path'
import test                       from 'node:test'
import { promisify }              from 'node:util'

import { installRepositoryHooks } from '../../../hooks/install.js'
import { createSha256Digest }     from '../../runtime/release.js'
import { installRaijin }          from '../install.js'

const execute = promisify(execFile)
const gitLocalVariables = (await execute('git', ['rev-parse', '--local-env-vars'])).stdout
  .trim()
  .split('\n')

const gitEnvironment = (): NodeJS.ProcessEnv => {
  const environment = { ...process.env }

  for (const name of gitLocalVariables) Reflect.deleteProperty(environment, name)

  return environment
}

const executeGit = async (args: Array<string>, cwd: string, environment: NodeJS.ProcessEnv = {}) =>
  execute('git', args, { cwd, env: { ...gitEnvironment(), ...environment } })

const runtime = Buffer.from('runtime')
const releaseFixture = {
  assetName: 'yarn.js',
  assetUrl: 'https://github.com/atls/raijin/releases/download/%40atls%2Fraijin%401.2.3/yarn.js',
  packageIntegrity: 'sha512-YWJjZA==',
  packageManager: 'yarn@4.14.1',
  packageName: '@atls/raijin',
  sha256: createSha256Digest(runtime),
  sourceRevision: 'a'.repeat(40),
  tagName: '@atls/raijin@1.2.3',
  version: '1.2.3',
}

const fetchImpl = (async (input: Request | URL | string) => {
  const url = input instanceof Request ? input.url : String(input)

  if (url.startsWith('https://registry.npmjs.org/')) {
    return Response.json({
      name: releaseFixture.packageName,
      'dist-tags': { latest: releaseFixture.version },
      versions: {
        [releaseFixture.version]: {
          name: releaseFixture.packageName,
          version: releaseFixture.version,
          gitHead: releaseFixture.sourceRevision,
          dist: { integrity: releaseFixture.packageIntegrity },
        },
      },
    })
  }

  if (url.includes('/releases/tags/')) {
    return Response.json({
      tag_name: releaseFixture.tagName,
      draft: false,
      prerelease: false,
      assets: [
        {
          name: releaseFixture.assetName,
          state: 'uploaded',
          digest: `sha256:${releaseFixture.sha256}`,
          browser_download_url: releaseFixture.assetUrl,
        },
      ],
    })
  }

  if (url.includes('/commits/')) {
    return Response.json({ sha: releaseFixture.sourceRevision })
  }

  if (url.includes('/contents/package.json')) {
    return Response.json({ packageManager: releaseFixture.packageManager })
  }

  return new Response(new Uint8Array(runtime))
}) as typeof fetch

const installOptions = (cwd: string) => ({
  cwd,
  fetchImpl,
  mode: 'update' as const,
  queryYarnPackage: async () => ({
    name: releaseFixture.packageName,
    version: releaseFixture.version,
    gitHead: releaseFixture.sourceRevision,
    dist: { integrity: releaseFixture.packageIntegrity },
  }),
  readYarnCommand: async (args: Array<string>) =>
    args[0] === '--version'
      ? '4.14.1\n'
      : JSON.stringify({ name: releaseFixture.packageName, version: releaseFixture.version }),
  runYarnCommand: async () => undefined,
})

const createRepository = async (context: { after: (callback: () => Promise<void>) => void }) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-hooks-'))
  const template = join(cwd, 'git-template')

  context.after(async () => rm(cwd, { recursive: true, force: true }))
  await mkdir(template)
  await executeGit(['init', '--quiet', `--template=${template}`], cwd)

  return cwd
}

const withoutSkipEnvironment = async (run: () => Promise<void>): Promise<void> => {
  const original = Object.fromEntries(
    [...gitLocalVariables, 'CI', 'GITHUB_ACTIONS', 'IMAGE_PACK', 'HUSKY'].map((name) => [
      name,
      process.env[name],
    ])
  )

  for (const name of Object.keys(original)) Reflect.deleteProperty(process.env, name)

  try {
    await run()
  } finally {
    for (const [name, value] of Object.entries(original)) {
      if (value === undefined) Reflect.deleteProperty(process.env, name)
      else process.env[name] = value
    }
  }
}

test('native Husky install is relative, idempotent, and preserves unrelated hooks', async (context) => {
  const cwd = await createRepository(context)
  const hooks = join(cwd, '.config/husky')
  const unrelated = join(hooks, 'pre-push')

  await mkdir(hooks, { recursive: true })
  await writeFile(unrelated, 'echo user hook\n')

  await withoutSkipEnvironment(async () => {
    await installRepositoryHooks(cwd)
    await installRepositoryHooks(cwd)
  })

  assert.equal(
    (await executeGit(['config', 'core.hooksPath'], cwd)).stdout.trim(),
    '.config/husky/_'
  )
  assert.equal(await readFile(unrelated, 'utf8'), 'echo user hook\n')
  assert.match(await readFile(join(hooks, '_/h'), 'utf8'), /HUSKY-/)

  await Promise.all(
    [
      ['commit-msg', 'yarn commit message lint "$1"'],
      ['pre-commit', 'yarn commit staged'],
      ['prepare-commit-msg', 'yarn commit message "$@"'],
    ].map(async ([name, command]) => {
      assert.equal(await readFile(join(hooks, name), 'utf8'), `# Raijin-managed hook\n${command}\n`)
      await access(join(hooks, name), constants.X_OK)
      await access(join(hooks, '_', name), constants.X_OK)
    })
  )
})

test('runtime update installs hooks only after activation and remains idempotent', async (context) => {
  const cwd = await createRepository(context)

  await writeFile(join(cwd, 'package.json'), '{"devDependencies":{"@atls/raijin":"0.7.0"}}\n')

  await withoutSkipEnvironment(async () => {
    await installRaijin({
      ...installOptions(cwd),
      afterActivated: async () => {
        assert.equal(await readFile(join(cwd, '.yarn/releases/yarn.js'), 'utf8'), 'runtime')
        await assert.rejects(executeGit(['config', 'core.hooksPath'], cwd))
      },
    })
    await installRaijin(installOptions(cwd))
  })

  assert.equal(
    (await executeGit(['config', 'core.hooksPath'], cwd)).stdout.trim(),
    '.config/husky/_'
  )
  await access(join(cwd, '.config/husky/_/pre-commit'), constants.X_OK)
  await assert.rejects(access(join(cwd, '.yarn/releases/yarn.js.pending')))
})

test('failed runtime activation leaves Git hooks untouched', async (context) => {
  const cwd = await createRepository(context)

  await writeFile(join(cwd, 'package.json'), '{"devDependencies":{"@atls/raijin":"0.7.0"}}\n')

  await withoutSkipEnvironment(async () => {
    await assert.rejects(
      installRaijin({
        ...installOptions(cwd),
        readYarnCommand: async (args) =>
          args[0] === '--version'
            ? '4.12.0\n'
            : JSON.stringify({ name: releaseFixture.packageName, version: releaseFixture.version }),
      }),
      /staged at/
    )
  })

  await assert.rejects(executeGit(['config', 'core.hooksPath'], cwd))
  await assert.rejects(access(join(cwd, '.config/husky')))
  await access(join(cwd, '.yarn/releases/yarn.js.pending'))
})

test('unowned same-name hook fails before Husky changes Git configuration', async (context) => {
  const cwd = await createRepository(context)
  const hooks = join(cwd, '.config/husky')

  await mkdir(hooks, { recursive: true })
  await writeFile(join(hooks, 'pre-commit'), 'echo user hook\n')

  await withoutSkipEnvironment(async () => {
    await assert.rejects(installRepositoryHooks(cwd), /existing hook is not Raijin-owned/)
  })

  assert.equal(await readFile(join(hooks, 'pre-commit'), 'utf8'), 'echo user hook\n')
  await assert.rejects(executeGit(['config', 'core.hooksPath'], cwd))
  await assert.rejects(access(join(hooks, '_')))
})

test('an active legacy hook keeps running when native Husky cannot wrap it', async (context) => {
  const cwd = await createRepository(context)
  const hooks = join(cwd, '.config/husky')
  const activeHook = join(hooks, 'post-index-change')
  const content = '#!/bin/sh\nprintf "ran\\n" >> observed-hook\n'

  await mkdir(hooks, { recursive: true })
  await writeFile(activeHook, content, { mode: 0o755 })
  await executeGit(['config', 'core.hooksPath', '.config/husky'], cwd)
  await writeFile(join(cwd, 'first.txt'), 'first\n')
  await executeGit(['add', 'first.txt'], cwd)
  assert.equal(await readFile(join(cwd, 'observed-hook'), 'utf8'), 'ran\n')

  await withoutSkipEnvironment(async () => {
    await assert.rejects(
      installRepositoryHooks(cwd),
      /active existing hook post-index-change would be disabled/
    )
  })

  assert.equal((await executeGit(['config', 'core.hooksPath'], cwd)).stdout.trim(), '.config/husky')
  assert.equal(await readFile(activeHook, 'utf8'), content)
  await assert.rejects(access(join(hooks, '_')))
  await writeFile(join(cwd, 'second.txt'), 'second\n')
  await executeGit(['add', 'second.txt'], cwd)
  assert.equal(await readFile(join(cwd, 'observed-hook'), 'utf8'), 'ran\nran\n')
})

test('a symlink with an ownership marker is still an unowned hook path', async (context) => {
  const cwd = await createRepository(context)
  const hooks = join(cwd, '.config/husky')
  const target = join(cwd, 'external-hook')

  await mkdir(hooks, { recursive: true })
  await writeFile(target, '# Raijin-managed hook\nyarn commit staged\n')
  await symlink(target, join(hooks, 'pre-commit'))

  await withoutSkipEnvironment(async () => {
    await assert.rejects(installRepositoryHooks(cwd), /existing hook is not Raijin-owned/)
  })

  assert.equal(await readFile(target, 'utf8'), '# Raijin-managed hook\nyarn commit staged\n')
  await assert.rejects(executeGit(['config', 'core.hooksPath'], cwd))
})

test('exact legacy Raijin entries migrate while keeping an unrelated Husky file', async (context) => {
  const cwd = await createRepository(context)
  const hooks = join(cwd, '.config/husky')

  await mkdir(join(hooks, '_'), { recursive: true })
  await writeFile(join(hooks, 'commit-msg'), 'yarn commit message lint\n')
  await writeFile(join(hooks, 'pre-commit'), 'yarn commit staged\n')
  await writeFile(join(hooks, 'prepare-commit-msg'), 'yarn commit message $@\n')
  await writeFile(join(hooks, '_/custom'), 'keep native neighbor\n')

  await withoutSkipEnvironment(async () => installRepositoryHooks(cwd))

  assert.equal(await readFile(join(hooks, '_/custom'), 'utf8'), 'keep native neighbor\n')
  assert.match(await readFile(join(hooks, 'commit-msg'), 'utf8'), /lint "\$1"\n$/)
})

test('each sibling worktree uses its own hook entries with one relative Git setting', async (context) => {
  const cwd = await createRepository(context)
  const sibling = join(dirname(cwd), `${basename(cwd)}-sibling`)

  context.after(async () => rm(sibling, { recursive: true, force: true }))

  await executeGit(
    [
      '-c',
      'core.hooksPath=/dev/null',
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '--allow-empty',
      '-m',
      'initial',
    ],
    cwd
  )
  await executeGit(['worktree', 'add', '--quiet', '-b', 'sibling', sibling], cwd)

  await withoutSkipEnvironment(async () => {
    await installRepositoryHooks(cwd)
    await installRepositoryHooks(sibling)
  })

  assert.equal(
    (await executeGit(['config', 'core.hooksPath'], sibling)).stdout.trim(),
    '.config/husky/_'
  )
  await access(join(cwd, '.config/husky/_/pre-commit'))
  await access(join(sibling, '.config/husky/_/pre-commit'))
  assert.equal(
    await readFile(join(cwd, '.config/husky/pre-commit'), 'utf8'),
    await readFile(join(sibling, '.config/husky/pre-commit'), 'utf8')
  )
})

for (const [name, value] of [
  ['CI', 'true'],
  ['CI', '1'],
  ['CI', 'yes'],
  ['GITHUB_ACTIONS', 'true'],
  ['IMAGE_PACK', '1'],
  ['HUSKY', '0'],
]) {
  test(`${name}=${value} leaves hook state untouched`, async (context) => {
    const cwd = await createRepository(context)

    await withoutSkipEnvironment(async () => {
      process.env[name] = value
      await installRepositoryHooks(cwd)
    })

    await assert.rejects(access(join(cwd, '.config/husky')))
    await assert.rejects(executeGit(['config', 'core.hooksPath'], cwd))
  })
}

for (const value of ['false', '0', ' FALSE ']) {
  test(`CI=${value} keeps local hook installation active`, async (context) => {
    const cwd = await createRepository(context)

    await withoutSkipEnvironment(async () => {
      process.env.CI = value
      await installRepositoryHooks(cwd)
    })

    assert.equal(
      (await executeGit(['config', 'core.hooksPath'], cwd)).stdout.trim(),
      '.config/husky/_'
    )
  })
}

test('missing Git repository is a non-installing bootstrap state', async (context) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-hooks-no-git-'))

  context.after(async () => rm(cwd, { recursive: true, force: true }))

  await withoutSkipEnvironment(async () => installRepositoryHooks(cwd))
  await assert.rejects(access(join(cwd, '.config/husky')))
})

test('unavailable Git fails before creating Raijin entry files', async (context) => {
  const cwd = await createRepository(context)
  const previousPath = process.env.PATH

  await withoutSkipEnvironment(async () => {
    process.env.PATH = cwd

    try {
      await assert.rejects(installRepositoryHooks(cwd), /spawn git ENOENT/)
    } finally {
      if (previousPath === undefined) delete process.env.PATH
      else process.env.PATH = previousPath
    }
  })

  await assert.rejects(access(join(cwd, '.config/husky/pre-commit')))
})

test('a failing hook command blocks a real Git commit through Husky', async (context) => {
  const cwd = await createRepository(context)
  const bin = join(cwd, 'bin')

  await mkdir(bin)
  await writeFile(join(bin, 'yarn'), '#!/bin/sh\nexit 17\n', { mode: 0o755 })
  await withoutSkipEnvironment(async () => installRepositoryHooks(cwd))

  await assert.rejects(
    executeGit(
      [
        '-c',
        'user.name=Fixture',
        '-c',
        'user.email=fixture@example.invalid',
        'commit',
        '--allow-empty',
        '-m',
        'test: fail hook',
      ],
      cwd,
      { PATH: `${bin}${delimiter}${process.env.PATH ?? ''}` }
    ),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.notEqual(Reflect.get(error, 'code'), 0)
      assert.match(
        `${String(Reflect.get(error, 'stdout'))}${String(Reflect.get(error, 'stderr'))}`,
        /husky - pre-commit script failed \(code 17\)/
      )

      return true
    }
  )
})

test('installed commit-message entries preserve Git arguments containing spaces', async (context) => {
  const cwd = await createRepository(context)
  const bin = join(cwd, 'bin')
  const log = join(cwd, 'hook-arguments.txt')
  const messageFile = join(cwd, 'message with spaces.txt')

  await mkdir(bin)
  await writeFile(join(bin, 'yarn'), '#!/bin/sh\nprintf "<%s>\\n" "$@" > "$RAIJIN_HOOK_LOG"\n', {
    mode: 0o755,
  })

  await withoutSkipEnvironment(async () => {
    await installRepositoryHooks(cwd)

    const env = {
      ...process.env,
      PATH: `${bin}${delimiter}${process.env.PATH ?? ''}`,
      RAIJIN_HOOK_LOG: log,
      XDG_CONFIG_HOME: cwd,
    }

    await executeGit(
      ['-c', 'alias.fixture-hook=!sh', 'fixture-hook', '.config/husky/_/commit-msg', messageFile],
      cwd,
      env
    )
    assert.equal(await readFile(log, 'utf8'), `<commit>\n<message>\n<lint>\n<${messageFile}>\n`)

    await executeGit(
      [
        '-c',
        'alias.fixture-hook=!sh',
        'fixture-hook',
        '.config/husky/_/prepare-commit-msg',
        messageFile,
        'message',
      ],
      cwd,
      env
    )
    assert.equal(await readFile(log, 'utf8'), `<commit>\n<message>\n<${messageFile}>\n<message>\n`)
  })
})
