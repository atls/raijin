import type { Rule }             from '@angular-devkit/schematics'
import type { SchematicContext } from '@angular-devkit/schematics'
import type { Tree }             from '@angular-devkit/schematics'

import stripJsonComments         from 'strip-json-comments'

const serializeProjectJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`

export const readProjectJson = <T>(tree: Tree, path: string): T => {
  const content = tree.read(path)

  if (!content) {
    throw new Error(`Project scaffold requires ${path}`)
  }

  return JSON.parse(stripJsonComments(content.toString('utf-8'))) as T
}

export const updateProjectJson = <T extends object = Record<string, unknown>>(
    path: string,
    update: (value: T, context: SchematicContext) => T
  ): Rule =>
  (tree: Tree, context: SchematicContext): Tree => {
    const current = tree.exists(path) ? readProjectJson<T>(tree, path) : ({} as T)
    const content = serializeProjectJson(update(current, context))

    if (tree.exists(path)) {
      tree.overwrite(path, content)
    } else {
      tree.create(path, content)
    }

    return tree
  }
