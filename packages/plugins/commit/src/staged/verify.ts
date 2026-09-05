import lintStaged from 'lint-staged'

const MAX_ARGUMENT_LENGTH = 4095

export const verifyStagedChanges = async (): Promise<boolean> =>
  lintStaged({ concurrent: false, maxArgLength: MAX_ARGUMENT_LENGTH, shell: false })
