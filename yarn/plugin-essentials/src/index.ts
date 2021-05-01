import { Plugin }       from '@yarnpkg/core'

import TypeScriptPlugin from '@atls/yarn-plugin-typescript'
import WorkspacesPlugin from '@atls/yarn-plugin-workspaces'
import GitHubPlugin     from '@atls/yarn-plugin-github'
import ChecksPlugin     from '@atls/yarn-plugin-checks'
import FilesPlugin      from '@atls/yarn-plugin-files'
import TestPlugin     from '@atls/yarn-plugin-test'
import LintPlugin       from '@atls/yarn-plugin-lint'

import { mergePlugins } from './merge-plugins.util'

const plugin: Plugin = mergePlugins([
  TypeScriptPlugin,
  WorkspacesPlugin,
  GitHubPlugin,
  ChecksPlugin,
  FilesPlugin,
  LintPlugin,
  TestPlugin,
])

export default plugin
