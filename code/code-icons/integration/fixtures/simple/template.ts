import type { TemplateBuilder } from '@babel/template'
import type { types as t }      from '@babel/core'

interface TemplateVariables {
  componentName: string
  interfaces: Array<t.TSInterfaceDeclaration>
  props: Array<t.Identifier | t.ObjectPattern>
  imports: Array<t.ImportDeclaration>
  exports: Array<t.ExportDeclaration | t.Statement | t.VariableDeclaration>
  jsx: t.JSXElement
}

interface TemplateContext {
  tpl: TemplateBuilder<string>['ast']
}

export default (variables: TemplateVariables, { tpl }: TemplateContext): string => tpl`
  import React from 'react'

  import { vars } from '@fixtures/icons-theme'
  
  export const ${variables.componentName} = ({ $color, ...props }) => (
    ${variables.jsx}
  );
  `
