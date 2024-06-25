import { PortablePath }     from '@yarnpkg/fslib'
import { jest }             from '@jest/globals'
import { describe }         from '@jest/globals'
import { expect }           from '@jest/globals'
import { test }             from '@jest/globals'
import { xfs }              from '@yarnpkg/fslib'

import { makeTemporaryEnv } from '@atls/yarn-test-utils'

jest.setTimeout(150000)

describe('yarn', () => {
  describe('commands', () => {
    describe('test', () => {
      test(
        'it should test unit without errors',
        makeTemporaryEnv(
          {
            dependencies: {
              '@atls/code-runtime': 'workspace:*',
              typescript: '5.2.2',
            },
          },
          async ({ path, run, source }) => {
            await run('install')

            await xfs.writeFilePromise(
              `${path}/unit-success.test.ts` as PortablePath,
              `
test('success', () => {
  expect(true).toBe(true)
})
`
            )

            const { code, stdout, stderr } = await run('test', 'unit')

            expect(code).toBe(0)
            expect(stdout).toContain('Done')
            expect(stderr).toContain('PASS ./unit-success.test.ts')
          }
        )
      )

      test(
        'it should test unit with errors',
        makeTemporaryEnv(
          {
            dependencies: {
              '@atls/code-runtime': 'workspace:*',
              typescript: '5.2.2',
            },
          },
          async ({ path, run, source }) => {
            await run('install')

            await xfs.writeFilePromise(
              `${path}/unit-invalid.test.ts` as PortablePath,
              `
test('success', () => {
  expect(true).toBe(false)
})
`
            )

            const { code, stdout, stderr } = await run('test', 'unit')

            expect(code).toBe(0)
            expect(stdout).toContain('Done')
            expect(stderr).toContain('FAIL ./unit-invalid.test.ts')
          }
        )
      )

      test(
        'it should test integration without errors',
        makeTemporaryEnv(
          {
            dependencies: {
              '@atls/code-runtime': 'workspace:*',
              typescript: '5.2.2',
            },
          },
          async ({ path, run, source }) => {
            await run('install')

            await xfs.mkdirPromise(`${path}/integration` as PortablePath)
            await xfs.writeFilePromise(
              `${path}/integration/success.test.ts` as PortablePath,
              `
test('success', () => {
  expect(true).toBe(true)
})
`
            )

            const { code, stdout, stderr } = await run('test', 'integration')

            expect(code).toBe(0)
            expect(stdout).toContain('Done')
            expect(stderr).toContain('PASS integration/success.test.ts')
          }
        )
      )

      test(
        'it should test integration with errors',
        makeTemporaryEnv(
          {
            dependencies: {
              '@atls/code-runtime': 'workspace:*',
              typescript: '5.2.2',
            },
          },
          async ({ path, run, source }) => {
            await run('install')

            await xfs.mkdirPromise(`${path}/integration` as PortablePath)
            await xfs.writeFilePromise(
              `${path}/integration/invalid.test.ts` as PortablePath,
              `
test('success', () => {
  expect(true).toBe(false)
})
`
            )

            const { code, stdout, stderr } = await run('test', 'integration')

            expect(code).toBe(0)
            expect(stdout).toContain('Done')
            expect(stderr).toContain('FAIL integration/invalid.test.ts')
          }
        )
      )
    })
  })
})
