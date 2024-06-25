import { describe }     from '@jest/globals'
import { expect }       from '@jest/globals'
import { it }           from '@jest/globals'

import { CommitLinter } from './commit.linter.js'

describe('code-commit', () => {
  it('lint', async () => {
    const { valid } = await new CommitLinter().lint('feat(common): init')

    expect(valid).toBe(true)
  })
})
