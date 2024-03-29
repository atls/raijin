import { existsSync } from 'node:fs'
import { dirname }    from 'node:path'
import { join }       from 'node:path'
import { isAbsolute } from 'node:path'
import { basename }   from 'node:path'
import { relative }   from 'node:path'

import fileLoader     from 'file-loader'
import { parse }      from 'protocol-buffers-schema'

export const getProtoFileName = (resourcePath) => {
  const hash = Buffer.from(dirname(resourcePath)).toString('hex')

  return `./${hash.substr(hash.length - 20)}-${basename(resourcePath)}`
}

export const resolvePackageImportPath = (packageName: string, importPath: string) => {
  const packagePath = packageName.replace(/\./g, '/')

  if (importPath.startsWith(packagePath)) {
    return relative(packagePath, importPath)
  }

  return importPath
}

export default function protoImportsLoader(source) {
  const { imports, package: packageName } = parse(source)

  const dependencies: Array<string> = []

  imports.forEach((importPath) => {
    if (!isAbsolute(importPath)) {
      const resolvedImportPath = resolvePackageImportPath(packageName, importPath)
      const importAbsolutePath = join(dirname(this.resourcePath), resolvedImportPath)

      if (existsSync(importAbsolutePath)) {
        const targetPath = getProtoFileName(importAbsolutePath)

        // eslint-disable-next-line no-param-reassign
        source = source.replace(importPath, targetPath)

        dependencies.push(`require('${importAbsolutePath}')`)

        this.addDependency(importAbsolutePath)
      }
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
