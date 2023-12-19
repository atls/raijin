import { PortablePath }     from '@yarnpkg/fslib'
import { xfs }              from '@yarnpkg/fslib'

import { makeTemporaryEnv } from './utils'

jest.setTimeout(150000)

describe('yarn', () => {
  describe('commands', () => {
    describe('typecheck', () => {
      test(
        'it should typecheck withouth errors',
        makeTemporaryEnv(
          {
            dependencies: {
              typescript: '^4.5.3',
            },
          },
          async ({ path, run, source }) => {
            await run('install')

            await xfs.writeFilePromise(
              `${path}/success.ts` as PortablePath,
              `
const s = (n: number) => n
s(5)
`
            )

            const { code, stdout } = await run('typecheck')

            expect(code).toBe(0)
            expect(stdout).toContain('➤ YN0000: ┌ Typecheck\n➤ YN0000: └ Completed\n➤ YN0000: Done')
          }
        )
      )
    })

    test(
      'it should typecheck with errors',
      makeTemporaryEnv(
        {
          dependencies: {
            typescript: '^4.5.3',
          },
        },
        async ({ path, run, source }) => {
          await run('install')

          await xfs.writeFilePromise(
            `${path}/invalid.ts` as PortablePath,
            `
const s = (n: string) => n
s(5)
`
          )

          try {
            await run('typecheck')
          } catch (error: any) {
            expect(error.code).toBe(1)
            expect(error.stdout).toContain(
              "Argument of type 'number' is not assignable to parameter of type"
            )
            expect(error.stdout).toContain('const s = (n: string) => n')
            expect(error.stdout).toContain('invalid.ts:3:2')
          }
        }
      )
    )
  })
})
