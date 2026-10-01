import assert                           from 'node:assert/strict'
import { mkdtemp }                      from 'node:fs/promises'
import { readdir }                      from 'node:fs/promises'
import { rm }                           from 'node:fs/promises'
import { createServer }                 from 'node:http'
import { tmpdir }                       from 'node:os'
import { join }                         from 'node:path'
import { test }                         from 'node:test'

import { createYarnCommandEnvironment } from '../command.js'
import { queryYarnPackage }             from '../command.js'

test('should allow nested yarn commands to follow configured yarnPath', () => {
  assert.deepEqual(
    createYarnCommandEnvironment('/repo/package', { FOO: 'bar', YARN_IGNORE_PATH: '1' }),
    {
      FOO: 'bar',
      INIT_CWD: '/repo/package',
      PROJECT_CWD: '/repo/package',
    }
  )
})

test('should query a published package from an empty bootstrap target without writing to it', async (context) => {
  const target = await mkdtemp(join(tmpdir(), 'raijin-empty-metadata-'))
  const name = '@atls/raijin-metadata-fixture'
  const version = '0.0.1'
  const gitHead = 'a'.repeat(40)
  const integrity = 'sha512-YWJjZA=='
  const server = createServer((_request, response) => {
    response.setHeader('content-type', 'application/json')
    response.end(
      JSON.stringify({
        name,
        'dist-tags': { latest: version },
        versions: { [version]: { name, version, gitHead, dist: { integrity } } },
      })
    )
  })

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  context.after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => {
        resolve()
      })
    })
    await rm(target, { recursive: true, force: true })
  })

  const address = server.address()

  assert.ok(address && typeof address !== 'string')

  const environmentNames = [
    'YARN_NPM_REGISTRY_SERVER',
    'YARN_NPM_PUBLISH_REGISTRY',
    'YARN_UNSAFE_HTTP_WHITELIST',
    'YARN_NPM_MINIMAL_AGE_GATE',
  ]
  const previousEnvironment = Object.fromEntries(
    environmentNames.map((environmentName) => [environmentName, process.env[environmentName]])
  )

  process.env.YARN_NPM_REGISTRY_SERVER = `http://127.0.0.1:${address.port}`
  process.env.YARN_NPM_PUBLISH_REGISTRY = `http://127.0.0.1:${address.port}`
  process.env.YARN_UNSAFE_HTTP_WHITELIST = '127.0.0.1'
  process.env.YARN_NPM_MINIMAL_AGE_GATE = '0'

  try {
    assert.deepEqual(await queryYarnPackage(name, version, target, 'yarn@4.18.0'), {
      name,
      version,
      gitHead,
      dist: { integrity },
    })
    assert.deepEqual(await readdir(target), [])
  } finally {
    for (const [environmentName, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) Reflect.deleteProperty(process.env, environmentName)
      else process.env[environmentName] = value
    }
  }
})

test(
  'should replace mixed-case command directories on Windows',
  { skip: process.platform !== 'win32' },
  () => {
    assert.deepEqual(
      createYarnCommandEnvironment('C:\\repo\\package', {
        Init_Cwd: 'C:\\stale-init',
        Project_Cwd: 'C:\\stale-project',
      }),
      {
        INIT_CWD: 'C:\\repo\\package',
        PROJECT_CWD: 'C:\\repo\\package',
      }
    )
  }
)
