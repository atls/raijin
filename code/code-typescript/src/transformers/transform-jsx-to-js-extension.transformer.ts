/* eslint-disable */

import type { ts as typescript } from '@atls/code-runtime/typescript'

export const transformJsxToJsExtension = (ts: typeof typescript) =>
  (ctx: typescript.TransformationContext): typescript.Transformer<typescript.SourceFile> => {
    const visitor = (node: typescript.Node): typescript.Node => {
      const { moduleSpecifier } = node as
        | typescript.ExportDeclaration
        | typescript.ImportDeclaration

      if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
        if (ts.isImportDeclaration(node)) {
          if (moduleSpecifier.text.endsWith('.jsx')) {
            return ctx.factory.updateImportDeclaration(
              node,
              node.modifiers,
              node.importClause,
              ctx.factory.createStringLiteral(moduleSpecifier.text.replace('.jsx', '.js')),
              node.assertClause
            )
          }
        }

        if (ts.isExportDeclaration(node)) {
          return ctx.factory.updateExportDeclaration(
            node,
            node.modifiers,
            node.isTypeOnly,
            node.exportClause,
            ctx.factory.createStringLiteral(moduleSpecifier.text.replace('.jsx', '.js')),
            node.assertClause
          )
        }
      }

      return ts.visitEachChild(node, visitor, ctx)
    }

    return (sf: typescript.SourceFile): typescript.SourceFile =>
      ts.visitNode(sf, visitor) as typescript.SourceFile
  }
