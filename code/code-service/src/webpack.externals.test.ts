import { strict as assert } from 'node:assert'
import { mkdtemp }          from 'node:fs/promises'
import { writeFile }        from 'node:fs/promises'
import { tmpdir }           from 'node:os'
import { join }             from 'node:path'
import { test }             from 'node:test'

import { WebpackExternals } from './webpack.externals.js'

test('should externalize non-workspace dependency ranges from all manifest dependency blocks', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'code-service-webpack-externals-'))

  await writeFile(
    join(cwd, 'package.json'),
    JSON.stringify({
      dependencies: {
        '@internal/module': 'workspace:*',
        '@nestjs/common': '^11',
      },
      devDependencies: {
        '@nestjs/terminus': '^10',
      },
      optionalDependencies: {
        '@fastify/swagger-ui': '^5',
      },
      peerDependencies: {
        rxjs: '^7',
      },
    })
  )

  const externals = await new WebpackExternals(cwd).build()

  const resolveExternal = async (request: string): Promise<{ result?: string; type?: string }> =>
    new Promise((resolve, reject) => {
      externals({ request }, (error, result, type) => {
        if (error) {
          reject(error)
        } else {
          resolve({ result, type })
        }
      })
    })

  assert.deepEqual(await resolveExternal('@nestjs/common'), {
    result: '@nestjs/common',
    type: 'commonjs',
  })
  assert.deepEqual(await resolveExternal('@nestjs/terminus'), {
    result: '@nestjs/terminus',
    type: 'commonjs',
  })
  assert.deepEqual(await resolveExternal('@fastify/swagger-ui'), {
    result: '@fastify/swagger-ui',
    type: 'commonjs',
  })
  assert.deepEqual(await resolveExternal('rxjs'), { result: 'rxjs', type: 'commonjs' })
  assert.deepEqual(await resolveExternal('@internal/module'), {
    result: undefined,
    type: undefined,
  })
})
