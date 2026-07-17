import type { Source }                         from '@angular-devkit/schematics'

import type { FileSystemSchematicDescription } from './template-source.interfaces.js'

import { resolve }                             from 'node:path'

import { NodeJsSyncHost }                      from '@angular-devkit/core/node'
import { HostCreateTree }                      from '@angular-devkit/schematics'
import { normalize }                           from '@angular-devkit/core'
import { virtualFs }                           from '@angular-devkit/core'

export const templateSource = (templatePath: string): Source =>
  (context) => {
    const { path: schematicPath } = context.schematic.description as FileSystemSchematicDescription

    if (schematicPath === undefined) {
      throw new Error('Cannot resolve schematic template source without schematic path')
    }

    const root = normalize(resolve(schematicPath, templatePath))

    return new HostCreateTree(new virtualFs.ScopedHost(new NodeJsSyncHost(), root))
  }
