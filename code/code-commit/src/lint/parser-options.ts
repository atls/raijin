export const parserOptions = {
  // eslint-disable-next-line
  headerPattern: /^(\w*)(?:\((.*)\))?: (.*)$/,
  headerCorrespondence: ['type', 'scope', 'subject'],
  noteKeywords: ['BREAKING CHANGE'],
  revertPattern: /^(?:Revert|revert:)\s"?([\s\S]+?)"?\s*This reverts commit (\w*)\./i,
  revertCorrespondence: ['header', 'hash'],
}
