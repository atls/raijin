import type { PortablePath } from '@yarnpkg/fslib'

import { describe }          from '@jest/globals'
import { expect }            from '@jest/globals'
import { test }              from '@jest/globals'
import { xfs }               from '@yarnpkg/fslib'
import { ppath }             from '@yarnpkg/fslib'

import { makeTemporaryEnv }  from '@atls/yarn-test-utils'

describe('yarn', () => {
  describe('commands', () => {
    describe('types check', () => {
      test(
        'it should typecheck withouth errors',
        makeTemporaryEnv(
          {
            dependencies: {
              '@atls/code-runtime': 'workspace:*',
            },
          },
          async ({ path, run }) => {
            await run('install')

            await xfs.writeFilePromise(
              ppath.join(path, 'success.ts' as PortablePath),
              `const s = (n: number) => n; s(5)`
            )

            const { code, stdout } = await run('types', 'check')

            expect(code).toBe(0)
            expect(stdout).toContain(
              '➤ YN0000: ┌ Types:Check\n➤ YN0000: └ Completed\n➤ YN0000: Done'
            )
          }
        )
      )
    })

    test(
      'it should typecheck with errors',
      makeTemporaryEnv(
        {
          dependencies: {
            '@atls/code-runtime': 'workspace:*',
          },
        },
        async ({ path, run }) => {
          await run('install')

          await xfs.writeFilePromise(
            ppath.join(path, 'invalid.ts' as PortablePath),
            `const s = (n: string) => n; s(5)`
          )

          try {
            await run('types', 'check')
          } catch (error: any) {
            expect(error.code).toBe(1)
            expect(error.stdout).toContain(
              "Argument of type 'number' is not assignable to parameter of type"
            )
            expect(error.stdout).toContain('const s = (n: string) => n; s(5)')
            expect(error.stdout).toContain('invalid.ts:1:30')
          }
        }
      )
    )
  })
})
