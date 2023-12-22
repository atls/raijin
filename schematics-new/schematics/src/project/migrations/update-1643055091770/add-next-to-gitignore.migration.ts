import { chain }                 from '@angular-devkit/schematics'

import { updateGitIgnoreInTree } from '@atls/schematics-utils-new'

const addNextToGitIgnore = updateGitIgnoreInTree((gitignore) => {
  if (!gitignore.includes('.next')) {
    gitignore.push('# next.js output')
    gitignore.push('.next')
    gitignore.push('')
  }

  return gitignore
})

export default () => chain([addNextToGitIgnore])
