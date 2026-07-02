export const getTypeScriptSpecifier = (specifier: string): string =>
  specifier
    .replace(/\.mjs$/, '.mts')
    .replace(/\.js$/, '.ts')
    .replace(/\.jsx$/, '.tsx')
