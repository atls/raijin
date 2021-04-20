import { Cli } from 'clipanion'
import { FormatCommand } from '../src'
import { readFileSync, writeFileSync } from 'fs'
import { version } from '../package.json'

const readUgly = () => readFileSync(`${__dirname}/mocks/ugly.ts`)
const readPretty = () => readFileSync(`${__dirname}/mocks/pretty.ts`)
const writeUgly = (content) => writeFileSync(`${__dirname}/mocks/ugly.ts`, content)

describe('actl-format', () => {
  const uglyBackup = readUgly()
  writeUgly(readUgly().toString().replaceAll('// ', ''))

  const [node, app, ...args] = process.argv

  const cli = new Cli({
    binaryLabel: `Actl-Format Test`,
    binaryName: `${node} ${app}`,
    binaryVersion: version,
  })

  cli.register(FormatCommand)

  it('should format the file according to prettier config', () => {
    cli
      .run(['format'], Cli.defaultContext)
      .then(() => expect(readUgly()).toMatchObject(readPretty()))
      .then(() => writeUgly(uglyBackup))
      .catch((err) => console.error(err))
    cli.runExit(args, Cli.defaultContext).catch((err) => console.error(err))
  })
})
