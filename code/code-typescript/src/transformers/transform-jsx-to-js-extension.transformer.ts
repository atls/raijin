import ts from 'typescript'

export const transformJsxToJsExtension = (
  ctx: ts.TransformationContext
): ts.Transformer<ts.SourceFile> => {
  const visitor = (node) => {
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      if (node.moduleSpecifier.text.endsWith('.jsx')) {
        return ctx.factory.updateImportDeclaration(
          node,
          node.modifiers,
          node.importClause,
          ctx.factory.createStringLiteral(node.moduleSpecifier.text.replace('.jsx', '.js')),
          node.assertClause
        )
      }
    }

    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      return ctx.factory.updateExportDeclaration(
        node,
        node.modifiers,
        node.isTypeOnly,
        node.exportClause,
        ctx.factory.createStringLiteral(node.moduleSpecifier.text.replace('.jsx', '.js')),
        node.assertClause
      )
    }

    return ts.visitEachChild(node, visitor, ctx)
  }

  return (sf: ts.SourceFile) => ts.visitNode(sf, visitor)
}
