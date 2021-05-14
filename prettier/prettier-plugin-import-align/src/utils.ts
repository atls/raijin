/* eslint-disable no-param-reassign */

export const nodeImportSize = (node) =>
  node.loc.end.column -
  node.loc.start.column -
  (node.source.loc.end.column - node.source.loc.start.column)
