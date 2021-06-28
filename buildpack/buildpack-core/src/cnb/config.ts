export class Config {
  constructor(readonly args: string[]) {}

  get arguments() {
    return this.args
  }
}
