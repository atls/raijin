import type { Hooks }               from '@yarnpkg/core'
import type { Plugin }              from '@yarnpkg/core'

import { structUtils }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { RendererBuildCommand }     from './build.js'
import { RendererDevCommand }       from './dev.js'
import { RendererStartCommand }     from './start.js'

const ESLINT_CONFIG_NEXT_COMPATIBILITY = 'eslint-config-next@16.3.6'

export const plugin: Plugin<Hooks> = {
  commands: defineCommandInvocations({
    workspace: [RendererBuildCommand, RendererDevCommand, RendererStartCommand],
  }),
  hooks: {
    registerPackageExtensions: async (_configuration, registerPackageExtension) => {
      registerPackageExtension(
        structUtils.parseDescriptor(ESLINT_CONFIG_NEXT_COMPATIBILITY, true),
        { peerDependencies: { next: '*' } }
      )
    },
  },
}
