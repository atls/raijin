const createYarnCommandFailureMessage = (args: Array<string>): string =>
  `Command failed: yarn ${args.join(' ')}`

export class RaijinYarnCommandException extends Error {
  constructor(args: Array<string>) {
    super(createYarnCommandFailureMessage(args))
    this.name = 'RaijinYarnCommandException'
  }
}
