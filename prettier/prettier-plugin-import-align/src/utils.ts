/* eslint-disable no-param-reassign */

export const nodeImportSize = (node) =>
  node.loc.end.column -
  node.loc.start.column -
  (node.source.loc.end.column - node.source.loc.start.column)

export const traverse = (parts, matcher) =>
  parts.map((part) => {
    if (part.parts) {
      part.parts = traverse(part.parts, matcher)
    }

    return matcher(part)
  })
