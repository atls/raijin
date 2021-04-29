import { Plugin }       from '@yarnpkg/core'

import TypeScriptPlugin from '@atls/yarn-plugin-typescript'
import WorkspacesPlugin from '@atls/yarn-plugin-workspaces'
import FilesPlugin      from '@atls/yarn-plugin-files'

import { mergePlugins } from './merge-plugins.util'

const plugin: Plugin = mergePlugins([
  TypeScriptPlugin,
  WorkspacesPlugin,
  FilesPlugin,
])

export default plugin
