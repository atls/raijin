export class Override extends Error {
  constructor(name: string) {
    super(`Managed Node execution cannot override ${name}`)
    this.name = 'ManagedEnvironmentVariableOverride'
  }
}
