export class EnvironmentOverrideError extends Error {
  constructor(readonly variable: string) {
    super(`Yarn command preparation cannot override ${variable}`)

    this.name = 'EnvironmentOverrideError'
  }
}
