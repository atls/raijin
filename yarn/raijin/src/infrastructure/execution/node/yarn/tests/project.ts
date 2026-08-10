import type * as YarnCli                  from '@yarnpkg/cli'
import type * as YarnCore                 from '@yarnpkg/core'

import assert                             from 'node:assert/strict'
import { createRequire }                  from 'node:module'

import { npath }                          from '@yarnpkg/fslib'

import { directory as fixturesDirectory } from './fixtures/paths.js'

const require = createRequire(import.meta.url)
const { Configuration, Project } = require('@yarnpkg/core') as Pick<
  typeof YarnCore,
  'Configuration' | 'Project'
>
const { getPluginConfiguration } = require('@yarnpkg/cli') as Pick<
  typeof YarnCli,
  'getPluginConfiguration'
>

const cwd = npath.toPortablePath(fixturesDirectory)

export const find = async (): ReturnType<typeof Project.find> => {
  const configuration = await Configuration.find(cwd, getPluginConfiguration())

  return Project.find(configuration, cwd)
}

const project = find()

export const get = async () => {
  const { project: instance, workspace } = await project

  assert.ok(workspace)

  return { project: instance, workspace }
}
