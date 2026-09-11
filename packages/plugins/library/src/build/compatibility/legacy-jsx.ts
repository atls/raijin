import type { ts as TypeScriptRuntime } from '@atls/raijin/typescript'

const rewriteSpecifier = (
  specifier: TypeScriptRuntime.Expression,
  context: TypeScriptRuntime.TransformationContext,
  typescript: typeof TypeScriptRuntime,
  jsx: TypeScriptRuntime.JsxEmit | undefined
): TypeScriptRuntime.Expression => {
  if (
    jsx !== typescript.JsxEmit.Preserve &&
    typescript.isStringLiteral(specifier) &&
    (specifier.text.startsWith('./') || specifier.text.startsWith('../')) &&
    specifier.text.endsWith('.jsx')
  ) {
    return context.factory.createStringLiteral(`${specifier.text.slice(0, -4)}.js`)
  }

  return specifier
}

export const rewriteLegacyJsxSpecifiers = (
    typescript: typeof TypeScriptRuntime,
    jsx: TypeScriptRuntime.JsxEmit | undefined
  ) =>
  (
    context: TypeScriptRuntime.TransformationContext
  ): TypeScriptRuntime.Transformer<TypeScriptRuntime.SourceFile> => {
    const visit = (
      node: TypeScriptRuntime.Node
    ): TypeScriptRuntime.VisitResult<TypeScriptRuntime.Node> => {
      if (typescript.isImportDeclaration(node)) {
        return context.factory.updateImportDeclaration(
          node,
          node.modifiers,
          node.importClause,
          rewriteSpecifier(node.moduleSpecifier, context, typescript, jsx),
          node.attributes
        )
      }

      if (typescript.isExportDeclaration(node) && node.moduleSpecifier) {
        return context.factory.updateExportDeclaration(
          node,
          node.modifiers,
          node.isTypeOnly,
          node.exportClause,
          rewriteSpecifier(node.moduleSpecifier, context, typescript, jsx),
          node.attributes
        )
      }

      return typescript.visitEachChild(node, visit, context)
    }

    return (sourceFile) => typescript.visitNode(sourceFile, visit) as TypeScriptRuntime.SourceFile
  }
