import { PortablePath }     from '@yarnpkg/fslib'
import { xfs }              from '@yarnpkg/fslib'

import { packageUtils }     from './utils/index.js'
import { makeTemporaryEnv } from './utils/index.js'

jest.setTimeout(150000)

describe('yarn', () => {
  describe('commands', () => {
    describe('schematics', () => {
      test('it should init project', async () => {
        await makeTemporaryEnv(
          {
            dependencies: {
              '@atls/schematics': await packageUtils.pack('@atls/schematics'),
            },
          },
          async ({ path, run, source }) => {
            await run('install')

            const { code } = await run('generate', 'project', '--type', 'project')

            expect(code).toBe(0)
            expect(xfs.existsPromise(`${path}/tsconfig.json` as PortablePath)).resolves.toBe(true)
            expect(xfs.existsPromise(`${path}/.gitignore` as PortablePath)).resolves.toBe(true)
            expect(
              xfs.existsPromise(`${path}/config/husky/.gitignore` as PortablePath)
            ).resolves.toBe(true)
            expect(
              xfs.existsPromise(`${path}/config/husky/commit-msg` as PortablePath)
            ).resolves.toBe(true)
            expect(
              xfs.existsPromise(`${path}/config/husky/pre-commit` as PortablePath)
            ).resolves.toBe(true)
            expect(
              xfs.existsPromise(`${path}/config/husky/prepare-commit-msg` as PortablePath)
            ).resolves.toBe(true)
            expect(
              xfs.existsPromise(`${path}/.github/workflows/checks.yaml` as PortablePath)
            ).resolves.toBe(true)
            expect(
              xfs.existsPromise(`${path}/.github/workflows/preview.yaml` as PortablePath)
            ).resolves.toBe(true)
            expect(
              xfs.existsPromise(`${path}/.github/workflows/release.yaml` as PortablePath)
            ).resolves.toBe(true)
          }
        )
      })

      test('it should init project libraries', async () => {
        await makeTemporaryEnv(
          {
            dependencies: {
              '@atls/schematics': await packageUtils.pack('@atls/schematics'),
            },
          },
          async ({ path, run, source }) => {
            await run('install')

            const { code } = await run('generate', 'project', '--type', 'libraries')

            expect(code).toBe(0)
            expect(xfs.existsPromise(`${path}/tsconfig.json` as PortablePath)).resolves.toBe(true)
            expect(xfs.existsPromise(`${path}/.gitignore` as PortablePath)).resolves.toBe(true)
            expect(
              xfs.existsPromise(`${path}/config/husky/.gitignore` as PortablePath)
            ).resolves.toBe(true)
            expect(
              xfs.existsPromise(`${path}/config/husky/commit-msg` as PortablePath)
            ).resolves.toBe(true)
            expect(
              xfs.existsPromise(`${path}/config/husky/pre-commit` as PortablePath)
            ).resolves.toBe(true)
            expect(
              xfs.existsPromise(`${path}/config/husky/prepare-commit-msg` as PortablePath)
            ).resolves.toBe(true)
            expect(
              xfs.existsPromise(`${path}/.github/workflows/checks.yaml` as PortablePath)
            ).resolves.toBe(true)
            expect(
              xfs.existsPromise(`${path}/.github/workflows/publish.yaml` as PortablePath)
            ).resolves.toBe(true)
            expect(
              xfs.existsPromise(`${path}/.github/workflows/version.yaml` as PortablePath)
            ).resolves.toBe(true)
          }
        )
      })
    })
  })
})
