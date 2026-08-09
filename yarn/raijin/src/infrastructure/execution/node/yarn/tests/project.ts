import assert                             from 'node:assert/strict'

import { Configuration }                  from '@yarnpkg/core'
import { Project }                        from '@yarnpkg/core'
import { getPluginConfiguration }         from '@yarnpkg/cli'
import { npath }                          from '@yarnpkg/fslib'

import { directory as fixturesDirectory } from './fixtures/paths.js'

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
