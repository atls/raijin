import { Plugin }       from '@yarnpkg/core'

import TypeScriptPlugin from '@atls/yarn-plugin-typescript'
import FormatPlugin     from '@atls/yarn-plugin-format'
import CommitPlugin     from '@atls/yarn-plugin-commit'
import LintPlugin       from '@atls/yarn-plugin-lint'
import TestPlugin       from '@atls/yarn-plugin-test'
import HuskyPlugin      from '@atls/yarn-plugin-husky'
import WorkspacesPlugin from '@atls/yarn-plugin-workspaces'
import FilesPlugin      from '@atls/yarn-plugin-files'
import AppPlugin        from '@atls/yarn-plugin-app'
import GitHubPlugin     from '@atls/yarn-plugin-github'
import ChecksPlugin     from '@atls/yarn-plugin-checks'
import CheckPlugin      from '@atls/yarn-plugin-check'

import { mergePlugins } from './merge-plugins.util'

const plugin: Plugin = mergePlugins([
  TypeScriptPlugin,
  WorkspacesPlugin,
  FormatPlugin,
  CommitPlugin,
  GitHubPlugin,
  ChecksPlugin,
  CheckPlugin,
  HuskyPlugin,
  FilesPlugin,
  LintPlugin,
  TestPlugin,
  AppPlugin,
])

export default plugin
