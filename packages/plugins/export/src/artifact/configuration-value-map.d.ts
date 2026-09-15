declare module '@yarnpkg/core' {
  interface ConfigurationValueMap {
    nodeLinker: {} | undefined
    supportedArchitectures: Map<string, Array<string> | null>
  }
}

export {}
