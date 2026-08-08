export interface PnpPackageInformation {
  packageLocation: string
}

export interface PnpRuntimeApi {
  getPackageInformation: (locator: {
    name: string
    reference: string
  }) => PnpPackageInformation | null
}
