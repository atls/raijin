import fileLoader from 'file-loader'
import path       from 'path'
import { parse }  from 'protocol-buffers-schema'

export const getProtoFileName = (resourcePath) => {
  const hash = Buffer.from(path.dirname(resourcePath)).toString('hex')

  return `./${hash.substr(hash.length - 20)}-${path.basename(resourcePath)}`
}

export const resolvePackageImportPath = (packageName: string, importPath: string) => {
  const packagePath = packageName.replace(/\./g, '/')

  if (importPath.startsWith(packagePath)) {
    return path.relative(packagePath, importPath)
  }

  return importPath
}

export default function protoImportsLoader(source) {
  const { imports, package: packageName } = parse(source)

  const dependencies: Array<string> = []

  imports.forEach((importPath) => {
    if (!path.isAbsolute(importPath)) {
      const resolvedImportPath = resolvePackageImportPath(packageName, importPath)
      const importAbsolutePath = path.join(path.dirname(this.resourcePath), resolvedImportPath)
      const targetPath = getProtoFileName(importAbsolutePath)

      // eslint-disable-next-line no-param-reassign
      source = source.replace(importPath, targetPath)

      dependencies.push(`require('${importAbsolutePath}')`)

      this.addDependency(importAbsolutePath)
    }
  })

  const result = fileLoader.call(
    {
      ...this,
      query: {
        postTransformPublicPath: (p) => `__non_webpack_require__.resolve(${p})`,
        name: getProtoFileName(this.resourcePath),
      },
    },
    source
  )

  return [...dependencies, result].join('\n')
}
