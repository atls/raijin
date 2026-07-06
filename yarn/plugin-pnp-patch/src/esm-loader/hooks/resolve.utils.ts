const getTypeScriptCandidates = (specifier: string): Array<string> => {
  if (specifier.endsWith('.mjs')) {
    return [specifier.replace(/\.mjs$/, '.mts')]
  }

  if (specifier.endsWith('.jsx')) {
    return [specifier.replace(/\.jsx$/, '.tsx')]
  }

  if (specifier.endsWith('.js')) {
    return [specifier.replace(/\.js$/, '.ts'), specifier.replace(/\.js$/, '.tsx')]
  }

  return []
}

export const getTypeScriptSpecifiers = (specifier: string): Array<string> => [
  ...getTypeScriptCandidates(specifier),
  specifier,
]
