import { ts } from '@atls/code-runtime/typescript'

export const transformJsxToJsExtension = (
  ctx: ts.TransformationContext
): ts.Transformer<ts.SourceFile> => {
  const visitor = (node: ts.Node): ts.Node => {
    const { moduleSpecifier } = node as ts.ExportDeclaration | ts.ImportDeclaration

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

  return (sf: ts.SourceFile): ts.SourceFile => ts.visitNode(sf, visitor) as ts.SourceFile
}
