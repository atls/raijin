import type { PnpRuntimeApi }     from './pnp-api.interfaces.js'

import assert                     from 'node:assert/strict'
import { mkdtemp }                from 'node:fs/promises'
import { readdir }                from 'node:fs/promises'
import { rm }                     from 'node:fs/promises'
import { tmpdir }                 from 'node:os'
import { dirname }                from 'node:path'
import { join }                   from 'node:path'
import { test }                   from 'node:test'
import { fileURLToPath }          from 'node:url'

import { Configuration }          from '@yarnpkg/core'
import { Project }                from '@yarnpkg/core'
import { getPluginConfiguration } from '@yarnpkg/cli'
import { npath }                  from '@yarnpkg/fslib'

import { installPackageBinaries } from './package-binaries.js'
import { loadProjectPnpApi }      from './pnp-api.js'

const testCwd = npath.toPortablePath(dirname(fileURLToPath(import.meta.url)))

test('should skip a locator that is unavailable in the current PnP map', async () => {
  const configuration = await Configuration.find(testCwd, getPluginConfiguration())
  const { project, workspace } = await Project.find(configuration, testCwd)
  assert.ok(workspace)
  await project.restoreInstallState()

  const installedPnpApi = loadProjectPnpApi(project)
  const pnpApi: PnpRuntimeApi = {
    getPackageInformation: (locator) =>
      locator.name === 'typescript' ? null : installedPnpApi.getPackageInformation(locator),
  }
  const binFolder = npath.toPortablePath(await mkdtemp(join(tmpdir(), 'raijin-package-binaries-')))

  try {
    await installPackageBinaries({
      binFolder,
      locator: workspace.anchoredLocator,
      pnpApi,
      project,
    })

    const binaries = await readdir(npath.fromPortablePath(binFolder))

    assert.ok(binaries.includes('prettier'))
    assert.ok(!binaries.includes('tsc'))
    assert.ok(!binaries.includes('tsc.cmd'))
  } finally {
    await rm(npath.fromPortablePath(binFolder), { force: true, recursive: true })
  }
})
