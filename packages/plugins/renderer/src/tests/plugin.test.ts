import type { Configuration } from '@yarnpkg/core'

import assert                 from 'node:assert/strict'
import test                   from 'node:test'

import { structUtils }        from '@yarnpkg/core'

import { plugin }             from '../plugin.js'

test('registers the missing Next peer for the affected eslint-config-next release', async () => {
  const extensions: Array<{ descriptor: string; next: string | undefined }> = []

  await plugin.hooks?.registerPackageExtensions?.({} as Configuration, (descriptor, extension) => {
    extensions.push({
      descriptor: structUtils.stringifyDescriptor(descriptor),
      next: extension.peerDependencies?.next,
    })
  })

  assert.deepEqual(extensions, [{ descriptor: 'eslint-config-next@16.3.6', next: '*' }])
})
