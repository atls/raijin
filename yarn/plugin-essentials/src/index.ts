import { Plugin }       from '@yarnpkg/core'

import TypeScriptPlugin from '@atls/yarn-plugin-typescript'
import LintPlugin       from '@atls/yarn-plugin-lint'
import WorkspacesPlugin from '@atls/yarn-plugin-workspaces'
import FilesPlugin      from '@atls/yarn-plugin-files'
import GitHubPlugin     from '@atls/yarn-plugin-github'
import ChecksPlugin     from '@atls/yarn-plugin-checks'

import { mergePlugins } from './merge-plugins.util'

const plugin: Plugin = mergePlugins([
  TypeScriptPlugin,
  WorkspacesPlugin,
  GitHubPlugin,
  ChecksPlugin,
  FilesPlugin,
  LintPlugin,
])

export default plugin
