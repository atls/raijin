export const isPnpPackageSource = (filepath: string): boolean => {
  const normalized = filepath.replaceAll('\\', '/')

  return normalized.includes('/.yarn/') && normalized.includes('/node_modules/')
}

export const getFileFormatByPackageType = (
  extension: string,
  packageType?: string,
  pnpPackageSource = false
): 'module' | null => {
  switch (extension) {
    case '.mts': {
      return 'module'
    }
    case '.ts':
    case '.tsx': {
      if (packageType === 'module' || pnpPackageSource) {
        return 'module'
      }

      throw new Error(
        `Raijin PnP TypeScript loader supports only ESM TypeScript sources with package.json type=module`
      )
    }
    default: {
      return null
    }
  }
}
