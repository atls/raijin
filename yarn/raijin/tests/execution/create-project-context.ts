import type * as YarnCli      from '@yarnpkg/cli'
import type * as YarnCore     from '@yarnpkg/core'

import assert                 from 'node:assert/strict'
import { createRequire }      from 'node:module'

import { npath }              from '@yarnpkg/fslib'

import { resolveFixturePath } from './resolve-fixture-path.js'

const require = createRequire(import.meta.url)
const { Configuration, Project } = require('@yarnpkg/core') as Pick<
  typeof YarnCore,
  'Configuration' | 'Project'
>
const { getPluginConfiguration } = require('@yarnpkg/cli') as Pick<
  typeof YarnCli,
  'getPluginConfiguration'
>

const cwd = npath.toPortablePath(resolveFixturePath())

export const createProjectContext = async () => {
  const configuration = await Configuration.find(cwd, getPluginConfiguration())
  const { project, workspace } = await Project.find(configuration, cwd)

  assert.ok(workspace)

  return { project, workspace }
}
