import path      from 'node:path'

import { parse } from 'protocol-buffers-schema'

export const getProtoFileName = (resourcePath: string): string => {
  const hash = Buffer.from(path.dirname(resourcePath)).toString('hex')

  return `./${hash.slice(hash.length - 20)}-${path.basename(resourcePath)}`
}

export const resolvePackageImportPath = (packageName: string, importPath: string): string => {
  const packagePath = packageName.replace(/\./g, '/')

  if (importPath.startsWith(packagePath)) {
    return path.relative(packagePath, importPath)
  }

  return importPath
}

interface ProtoImportsLoaderContext {
  resourcePath: string
  addDependency: (file: string) => void
  emitFile: (name: string, content: string | Buffer) => void
}

const getEmittedFileName = (resourcePath: string): string =>
  getProtoFileName(resourcePath).replace(/^\.\//, '')

export default function protoImportsLoader(
  this: ProtoImportsLoaderContext,
  source: Buffer | string
): string {
  let sourceText = Buffer.isBuffer(source) ? source.toString() : source

  const { imports, package: packageName } = parse(sourceText)

  const dependencies: Array<string> = []

  imports.forEach((importPath) => {
    if (!path.isAbsolute(importPath) && typeof packageName === 'string') {
      const resolvedImportPath = resolvePackageImportPath(packageName, importPath)
      const importAbsolutePath = path.join(path.dirname(this.resourcePath), resolvedImportPath)
      const targetPath = getProtoFileName(importAbsolutePath)

      sourceText = sourceText.replace(importPath, targetPath)

      dependencies.push(`require(${JSON.stringify(importAbsolutePath)})`)

      this.addDependency(importAbsolutePath)
    }
  })

  const emittedFileName = getEmittedFileName(this.resourcePath)

  this.emitFile(emittedFileName, sourceText)

  const resolvedPathExport = `export default __non_webpack_require__.resolve(__webpack_public_path__ + ${JSON.stringify(emittedFileName)})`

  return [...dependencies, resolvedPathExport].join('\n')
}
