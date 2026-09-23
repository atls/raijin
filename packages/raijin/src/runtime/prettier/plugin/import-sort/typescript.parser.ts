import type { Node }              from '@babel/types'
import type { Comment }           from '@babel/types'
import type { ImportDeclaration } from '@babel/types'
import type { IImport }           from 'import-sort-parser'
import type { IParser }           from 'import-sort-parser'
import type { NamedMember }       from 'import-sort-parser'
import type { AST }               from 'prettier'

const formatSplitNamedImport = (
  program: AST,
  code: string,
  imported: IImport,
  eol: string,
  isLastImport: boolean
): string | undefined => {
  const node = (program.body as Array<Node>).find(
    (entry) => entry.type === 'ImportDeclaration' && entry.range?.[0] === imported.importStart
  ) as ImportDeclaration | undefined

  if (
    !node?.range ||
    node.specifiers.length < 2 ||
    !node.specifiers.every(
      (specifier) =>
        specifier.type === 'ImportSpecifier' || specifier.type === 'ImportDefaultSpecifier'
    )
  ) {
    return undefined
  }

  const { range } = node
  const comments = program.comments as Array<{ range?: [number, number] }>

  if (
    comments.some(
      ({ range: commentRange }) =>
        commentRange !== undefined && commentRange[0] >= range[0] && commentRange[1] <= range[1]
    )
  ) {
    return undefined
  }

  const namedMembers = imported.namedMembers.map(({ name, alias }) => {
    const specifier = node.specifiers.find((entry) => {
      if (entry.type !== 'ImportSpecifier') {
        return false
      }

      const importedName =
        entry.imported.type === 'Identifier' ? entry.imported.name : entry.imported.value

      return importedName === name && entry.local.name === alias
    })

    return specifier?.range ? code.slice(specifier.range[0], specifier.range[1]) : undefined
  })

  if (!namedMembers.every((member) => member !== undefined)) {
    return undefined
  }

  const defaultSpecifier = node.specifiers.find(
    (specifier) => specifier.type === 'ImportDefaultSpecifier'
  )

  if (defaultSpecifier?.range && node.source.range) {
    const moduleSource = code.slice(node.source.range[0], node.source.range[1])
    const suffix = code.slice(node.source.range[1], range[1])
    const importKeyword = node.importKind === 'type' ? 'import type' : 'import'
    const namedDeclarations = namedMembers.map(
      (member) => `${importKeyword} { ${member} } from ${moduleSource}${suffix}`
    )
    const defaultDeclaration = `${importKeyword} ${code.slice(defaultSpecifier.range[0], defaultSpecifier.range[1])} from ${moduleSource}${suffix}`

    return [...namedDeclarations, defaultDeclaration].join(eol)
  }

  const first = node.specifiers[0]
  const last = node.specifiers.at(-1)!
  const prefix = code.slice(range[0], first.range![0])
  const suffix = code.slice(last.range![1], range[1])

  return `${namedMembers.map((member) => `${prefix}${member}${suffix}`).join(eol)}${isLastImport ? eol : ''}`
}

export class ImportSortTypeScriptParser implements IParser {
  private remainingImports = 0

  constructor(private readonly program: AST) {}

  parseImports(code: string): Array<IImport> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const imports: Array<IImport> = this.program.body
      .filter((node: Node) => node.type === 'ImportDeclaration')
      .map((node: ImportDeclaration) => {
        const imp: IImport = {
          start: node.range![0],

          end: node.range![1],

          importStart: node.range![0],

          importEnd: node.range![1],

          type: node.importKind === 'type' ? 'import-type' : 'import',

          moduleName: node.source.value,

          defaultMember: node.specifiers.find(
            (specifier) => specifier.type === 'ImportDefaultSpecifier'
          )?.local.name,

          namespaceMember: node.specifiers.find(
            (specifier) => specifier.type === 'ImportNamespaceSpecifier'
          )?.local.name,

          namedMembers: node.specifiers
            .filter((specifier) => specifier.type === 'ImportSpecifier')
            .map((specifier) => ({
              // @ts-expect-error property does not exist
              name: specifier.imported.name,
              alias: specifier.local.name,
              type: specifier.importKind === 'type',
            })),
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const lineComment = this.program.comments.find(
          (comment: Comment) =>
            comment.loc!.start.line === node.loc!.start.line &&
            comment.loc!.end.line === node.loc!.end.line
        )

        if (lineComment) {
          // eslint-disable-next-line prefer-destructuring
          imp.end = lineComment.range[1]
        }

        const findLeadingComments = (position: number): typeof this.program.comments => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          const leadingComment = this.program.comments.find(
            (comment: Comment) => comment.loc!.start.line === position
          )

          if (!leadingComment) {
            return []
          }

          const parents = findLeadingComments(leadingComment.loc.start.line - 1)

          return [...parents, leadingComment]
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const leadingComments: Array<any> = findLeadingComments(node.loc!.start.line - 1)

        if (leadingComments.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          imp.start = leadingComments.at(0).range.at(0)
        }

        return imp
      })

    this.remainingImports = imports.length

    return imports
  }

  formatImport(code: string, imported: IImport, eol = '\n'): string {
    const importStart = imported.importStart || imported.start
    const importEnd = imported.importEnd || imported.end

    const importCode = code.substring(importStart, importEnd)
    this.remainingImports -= 1

    const splitNamedImport = formatSplitNamedImport(
      this.program,
      code,
      imported,
      eol,
      this.remainingImports === 0
    )

    if (splitNamedImport !== undefined) {
      return (
        code.substring(imported.start, importStart) +
        splitNamedImport +
        code.substring(importEnd, importEnd + (imported.end - importEnd))
      )
    }

    const { namedMembers } = imported

    if (namedMembers.length === 0) {
      return code.substring(imported.start, imported.end)
    }

    const newImportCode = importCode.replace(/\{[\s\S]*\}/g, (namedMembersString) => {
      const useMultipleLines = namedMembersString.includes(eol)

      let prefix: string | undefined

      if (useMultipleLines) {
        ;[prefix] = namedMembersString.split(eol)[1].match(/^\s*/)
      }

      const useSpaces = namedMembersString.charAt(1) === ' '

      const userTrailingComma = namedMembersString.replace('}', '').trim().endsWith(',')

      return this.formatNamedMembers(
        namedMembers,
        useMultipleLines,
        useSpaces,
        userTrailingComma,
        prefix,
        eol
      )
    })

    return (
      code.substring(imported.start, importStart) +
      newImportCode +
      code.substring(importEnd, importEnd + (imported.end - importEnd))
    )
  }

  formatNamedMembers(
    namedMembers: Array<NamedMember>,
    useMultipleLines: boolean,
    useSpaces: boolean,
    useTrailingComma: boolean,
    prefix: string = '',
    eol = '\n'
  ): string {
    /* eslint-disable prefer-template */

    if (useMultipleLines) {
      return (
        '{' +
        eol +
        namedMembers
          .map(({ name, alias, type }: NamedMember, index) => {
            const lastImport: boolean = index === namedMembers.length - 1
            const comma: string = !useTrailingComma && lastImport ? '' : ','
            const member = `${type ? 'type ' : ''}${name}`

            if (name === alias) {
              return `${prefix}${member}${comma}` + eol
            }

            return `${prefix}${member} as ${alias}${comma}` + eol
          })
          .join('') +
        '}'
      )
    }

    const space = useSpaces ? ' ' : ''
    const comma = useTrailingComma ? ',' : ''

    return (
      '{' +
      space +
      namedMembers
        .map(({ name, alias, type }) => {
          const member = `${type ? 'type ' : ''}${name}`

          if (name === alias) {
            return member
          }

          return `${member} as ${alias}`
        })
        .join(', ') +
      comma +
      space +
      '}'
    )
    /* eslint-enable prefer-template */
  }
}
