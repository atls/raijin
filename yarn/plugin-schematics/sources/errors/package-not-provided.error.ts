const SCHEMATICS_PACKAGE_NAME = '@atls/schematics'

export class PackageNotProvidedError extends Error {
  constructor() {
    super(`Package ${SCHEMATICS_PACKAGE_NAME} not provided`)
  }
}
