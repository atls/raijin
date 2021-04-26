import { Cli } from 'clipanion'
import { TestCommand } from '../src'

import { version } from '../package.json'

describe('actl-test', () => {
  // @ts-ignore
  jest.spyOn(process, 'exit').mockImplementation(jest.fn())

  const [node, app, ...args] = process.argv

  const cli = new Cli({
    binaryLabel: `Actl-Test Test`,
    binaryName: `${node} ${app}`,
    binaryVersion: version,
  })

  cli.register(TestCommand)

  it('should run all tests', () => {
    cli.run(['test','-t mock'], Cli.defaultContext)
    cli.runExit(args, Cli.defaultContext)
      .then(() => expect(process.exitCode).toBe(1))
  })
})
