export const getFileFormatByPackageType = (
  extension: string,
  packageType?: string
): 'module' | null => {
  switch (extension) {
    case '.mts': {
      return 'module'
    }
    case '.ts':
    case '.tsx': {
      if (packageType === 'module') {
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
