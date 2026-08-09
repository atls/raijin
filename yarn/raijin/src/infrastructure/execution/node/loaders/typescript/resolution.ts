export class Resolution extends Error {
  private constructor(message: string) {
    super(message)
    this.name = 'TypeScriptLoaderResolution'
  }

  static sourceUnavailable(packageName: string): Resolution {
    return new Resolution(`Unable to resolve source TypeScript loader for ${packageName}`)
  }

  static unavailable(packageName: string): Resolution {
    return new Resolution(`Unable to resolve loadable TypeScript loader for ${packageName}`)
  }
}
