import type { FileSystemSchematicDesc }            from '@angular-devkit/schematics/tools'

import { dirname }                                 from 'node:path'
import { join }                                    from 'node:path'
import { resolve }                                 from 'node:path'

import { RuleFactory }                             from '@angular-devkit/schematics/'
import { FileSystemCollectionDesc }                from '@angular-devkit/schematics/tools'
import { ExportStringRef }                         from '@angular-devkit/schematics/tools'
import { CollectionCannotBeResolvedException }     from '@angular-devkit/schematics/tools'
import { CollectionMissingSchematicsMapException } from '@angular-devkit/schematics/tools'
import { FileSystemEngineHostBase }                from '@angular-devkit/schematics/tools'
import { SchematicMissingFieldsException }         from '@angular-devkit/schematics/tools'
import { NodePackageDoesNotSupportSchematics }     from '@angular-devkit/schematics/tools'
// @ts-expect-error any
import { readJsonFile }                            from '@angular-devkit/schematics/tools/file-system-utility'

export class NodePnpEngineHost extends FileSystemEngineHostBase {
  constructor(private readonly paths?: string[]) {
    super()
  }

  private resolve(name: string, requester?: string, references = new Set<string>()): string {
    if (requester) {
      if (references.has(requester)) {
        references.add(requester)
        throw new Error(
          `Circular schematic reference detected: ${JSON.stringify(Array.from(references))}`
        )
      } else {
        references.add(requester)
      }
    }

    const relativeBase = requester ? dirname(requester) : process.cwd()

    let collectionPath: string | undefined

    if (name.startsWith('.')) {
      // eslint-disable-next-line no-param-reassign
      name = resolve(relativeBase, name)
    }

    const resolveOptions = {
      paths: (requester ? [dirname(requester), ...(this.paths || [])] : this.paths)?.filter(
        Boolean
      ),
    }

    try {
      const packageJsonPath = require.resolve(join(name, 'package.json'), resolveOptions)

      const { schematics } = require(packageJsonPath)

      if (!schematics || typeof schematics !== 'string') {
        throw new NodePackageDoesNotSupportSchematics(name)
      }

      collectionPath = this.resolve(schematics, packageJsonPath, references)
    } catch (e: any) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        throw e
      }
    }

    if (!collectionPath) {
      try {
        collectionPath = require.resolve(name, resolveOptions)
      } catch (e: any) {
        if (e.code !== 'MODULE_NOT_FOUND') {
          throw e
        }
      }
    }

    if (!collectionPath) {
      throw new CollectionCannotBeResolvedException(name)
    }

    return collectionPath
  }

  // eslint-disable-next-line no-underscore-dangle
  protected _resolveCollectionPath(name: string, requester?: string): string {
    const collectionPath = this.resolve(name, requester)
    readJsonFile(collectionPath)

    return collectionPath
  }

  // eslint-disable-next-line no-underscore-dangle
  protected _resolveReferenceString(refString: string, parentPath: string) {
    const ref = new ExportStringRef<RuleFactory<{}>>(refString, parentPath)
    if (!ref.ref) {
      return null
    }

    return { ref: ref.ref, path: ref.module }
  }

  // eslint-disable-next-line no-underscore-dangle
  protected _transformCollectionDescription(
    name: string,
    desc: Partial<FileSystemCollectionDesc>
  ): FileSystemCollectionDesc {
    if (!desc.schematics || typeof desc.schematics !== 'object') {
      throw new CollectionMissingSchematicsMapException(name)
    }

    return {
      ...desc,
      name,
    } as FileSystemCollectionDesc
  }

  // eslint-disable-next-line no-underscore-dangle
  protected _transformSchematicDescription(
    name: string,
    _collection: FileSystemCollectionDesc,
    desc: Partial<FileSystemSchematicDesc>
  ): FileSystemSchematicDesc {
    if (!desc.factoryFn || !desc.path || !desc.description) {
      throw new SchematicMissingFieldsException(name)
    }

    return desc as FileSystemSchematicDesc
  }
}
