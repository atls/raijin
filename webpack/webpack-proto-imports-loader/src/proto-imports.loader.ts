import path       from 'node:path'

import { parse }  from 'protocol-buffers-schema'
import fileLoader from 'file-loader'

export const getProtoFileName = (resourcePath: string) => {
  const hash = Buffer.from(path.dirname(resourcePath)).toString('hex')

  return `./${hash.slice(hash.length - 20)}-${path.basename(resourcePath)}`
}

export const resolvePackageImportPath = (packageName: string, importPath: string) => {
  const packagePath = packageName.replace(/\./g, '/')

  if (importPath.startsWith(packagePath)) {
    return path.relative(packagePath, importPath)
  }

  return importPath
}

export default function protoImportsLoader(source: string | Buffer): string {
  const { imports, package: packageName } = parse(source)

  const dependencies: Array<string> = []

  imports.forEach((importPath) => {
    if (!path.isAbsolute(importPath)) {
      // @ts-expect-error null
      const resolvedImportPath = resolvePackageImportPath(packageName, importPath)
      // @ts-expect-error this is undefined
      const importAbsolutePath = path.join(path.dirname(this.resourcePath), resolvedImportPath)
      const targetPath = getProtoFileName(importAbsolutePath)

      // eslint-disable-next-line no-param-reassign
      // @ts-expect-error source can be buffer
      source = source.replace(importPath, targetPath)

      dependencies.push(`require('${importAbsolutePath}')`)

      // @ts-expect-error this is undefined
      this.addDependency(importAbsolutePath)
    }
  })

  const result = fileLoader.call(
    {
      // @ts-expect-error this is undefined
      ...this,
      query: {
        postTransformPublicPath: (p: string) => `__non_webpack_require__.resolve(${p})`,
        // @ts-expect-error this is undefined
        name: getProtoFileName(this.resourcePath),
      },
    },
    source
  )

  return [...dependencies, result].join('\n')
}
