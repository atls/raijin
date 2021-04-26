import { Cli } from 'clipanion'
import { readFileSync, writeFileSync } from 'fs'
import { LintCommand } from '../src'

import { version } from '../package.json'

const readBadFile = () => readFileSync(`${__dirname}/mocks/bad-lint.ts`)
const readPassFile = () => readFileSync(`${__dirname}/mocks/pass-lint.ts`)
const writeBadFile = content => writeFileSync(`${__dirname}/mocks/bad-lint.ts`, content)

describe('actl-lint', () => {
  // @ts-ignore
  jest.spyOn(process, 'exit').mockImplementation(jest.fn())

  const badLintBackup = readBadFile()
  writeBadFile(
    readBadFile()
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
    expect(badLintBackup).not.toMatchObject(readPassFile())

    return cli
      .run(['lint', '--fix'], Cli.defaultContext)
      .then(() => {
        expect(readBadFile()).toMatchObject(readPassFile())
      })
      .then(() => writeBadFile(badLintBackup))
    cli.runExit(args, Cli.defaultContext)
  })
})
