import { PortablePath }     from '@yarnpkg/fslib'
import { xfs }              from '@yarnpkg/fslib'

import { packageUtils }     from './utils'
import { makeTemporaryEnv } from './utils'

jest.setTimeout(150000)

const content = `
const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port)`

describe('yarn', () => {
  describe('commands', () => {
    describe('service', () => {
      test('it should build withouth errors', async () => {
        makeTemporaryEnv(
          {
            dependencies: {
              '@atls/code-service': await packageUtils.pack('@atls/schematics'),
              express: '*',
            },
          },
          async ({ path, run, source }) => {
            await run('install')

            await xfs.mkdirPromise(`${path}/src` as PortablePath)
            await xfs.writeFilePromise(`${path}/src/index.ts` as PortablePath, content)

            const { code, stdout } = await run('service', 'build')

            expect(code).toBe(0)
            expect(stdout).toContain('➤ YN0000: └ Completed')

            await expect(
              xfs.readFilePromise(`${path}/dist/index.js` as PortablePath, 'utf8')
            ).resolves.toContain('Hello World!')
          }
        )
      })

      test('it should build with errors', async () => {
        makeTemporaryEnv(
          {
            dependencies: {
              '@atls/code-service': await packageUtils.pack('@atls/schematics'),
            },
          },
          async ({ path, run, source }) => {
            await run('install')

            await xfs.mkdirPromise(`${path}/src` as PortablePath)
            await xfs.writeFilePromise(`${path}/src/index.ts` as PortablePath, content)

            try {
              await run('service', 'build')
            } catch (error: any) {
              expect(error.code).toBe(1)
              expect(error.stdout).toContain("Module not found: Error: Can't resolve 'express'")
            }
          }
        )
      })
    })
  })
})
