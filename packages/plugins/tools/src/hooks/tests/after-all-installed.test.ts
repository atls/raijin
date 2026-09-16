import type { Project }      from '@yarnpkg/core'

import test                  from 'node:test'

import { afterAllInstalled } from '../after-all-installed.js'

test('skipped installation does not resolve a Raijin binary', async () => {
  const previous = process.env.GITHUB_ACTIONS

  process.env.GITHUB_ACTIONS = 'true'

  try {
    await afterAllInstalled({} as Project)
  } finally {
    if (previous === undefined) delete process.env.GITHUB_ACTIONS
    else process.env.GITHUB_ACTIONS = previous
  }
})
