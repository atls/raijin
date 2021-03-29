import { Cli } from 'clipanion'
import { readFileSync, writeFileSync } from 'fs'
import { LintCommand } from '../src'

import { version } from '../package.json'

describe('actl-lint', () => {
  // @ts-ignore
  jest.spyOn(process, 'exit').mockImplementation(jest.fn())

  const badLintBackup = readFileSync(`${__dirname}/mocks/bad-lint.ts`)
  writeFileSync(
    `${__dirname}/mocks/bad-lint.ts`,
    readFileSync(`${__dirname}/mocks/bad-lint.ts`)
      .toString()
      .replaceAll('//', ''),
  )

  const [node, app, ...args] = process.argv

  const cli = new Cli({
    binaryLabel: `Actl-Lint Test`,
    binaryName: `${node} ${app}`,
    binaryVersion: version,
  })

  cli.register(LintCommand)

  it('should detect problems', () => {
    cli.run(['lint'], Cli.defaultContext)
    return cli.runExit(args, Cli.defaultContext).then(() => expect(process.exitCode).toBe(1))
  })

  it('should fix problems', () => {
    expect(badLintBackup).not.toMatchObject(readFileSync(`${__dirname}/mocks/pass-lint.ts`))

    return cli
      .run(['lint', '--fix'], Cli.defaultContext)
      .then(() => {
        expect(readFileSync(`${__dirname}/mocks/bad-lint.ts`)).toMatchObject(
          readFileSync(`${__dirname}/mocks/pass-lint.ts`),
        )
      })
      .then(() => writeFileSync(`${__dirname}/mocks/bad-lint.ts`, badLintBackup))
    cli.runExit(args, Cli.defaultContext)
  })
})
