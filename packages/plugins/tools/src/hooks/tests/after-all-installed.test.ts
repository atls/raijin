import type { Project }      from '@yarnpkg/core'

import assert                from 'node:assert/strict'
import test                  from 'node:test'

import { structUtils }       from '@yarnpkg/core'

import { afterAllInstalled } from '../after-all-installed.js'

const withoutSkip = async (run: () => Promise<void>): Promise<void> => {
  const names = ['CI', 'GITHUB_ACTIONS', 'IMAGE_PACK', 'HUSKY']
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]))

  for (const name of names) Reflect.deleteProperty(process.env, name)

  try {
    await run()
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) Reflect.deleteProperty(process.env, name)
      else process.env[name] = value
    }
  }
}

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

test('project without an installed Raijin package does not resolve a hook binary', async () => {
  await withoutSkip(async () => {
    await afterAllInstalled({ storedPackages: new Map() } as unknown as Project)
  })
})

test('multiple resolved Raijin packages fail instead of choosing an arbitrary binary', async () => {
  const ident = structUtils.makeIdent('atls', 'raijin')
  const first = structUtils.makeLocator(ident, 'npm:1.0.0')
  const second = structUtils.makeLocator(ident, 'npm:2.0.0')

  await withoutSkip(async () => {
    await assert.rejects(
      afterAllInstalled({
        storedPackages: new Map([
          [first.locatorHash, first],
          [second.locatorHash, second],
        ]),
      } as unknown as Project),
      /Multiple installed @atls\/raijin packages/
    )
  })
})
