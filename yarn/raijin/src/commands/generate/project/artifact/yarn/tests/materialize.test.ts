import assert                            from 'node:assert/strict'
import { access }                        from 'node:fs/promises'
import { readFile }                      from 'node:fs/promises'
import { test }                          from 'node:test'

import { Configuration }                 from '@yarnpkg/core'
import { Project }                       from '@yarnpkg/core'
import { getPluginConfiguration }        from '@yarnpkg/cli'
import { npath }                         from '@yarnpkg/fslib'
import { ppath }                         from '@yarnpkg/fslib'

import { withProjectGenerationArtifact } from '../materialize.js'

test('should materialize the installed Raijin artifact for one consumer lifecycle', async () => {
  const cwd = npath.toPortablePath(process.cwd())
  const configuration = await Configuration.find(cwd, getPluginConfiguration())
  const { project } = await Project.find(configuration, cwd)
  const makeFetcher = configuration.makeFetcher.bind(configuration)
  let materializedArtifactDir: string | undefined
  let released = false

  configuration.makeFetcher = () => {
    const fetcher = makeFetcher()
    const fetch = fetcher.fetch.bind(fetcher)

    fetcher.fetch = async (...args) => {
      const result = await fetch(...args)
      const { releaseFs } = result

      return {
        ...result,
        releaseFs: () => {
          released = true
          releaseFs?.()
        },
      }
    }

    return fetcher
  }

  await withProjectGenerationArtifact({ configuration, project }, async (collection) => {
    assert.equal(released, false)
    materializedArtifactDir = npath.fromPortablePath(ppath.dirname(collection))
    const manifest = JSON.parse(await readFile(npath.fromPortablePath(collection), 'utf8')) as {
      schematics?: Record<string, unknown>
    }

    assert.ok(manifest.schematics?.project)

    return undefined
  })

  assert.ok(materializedArtifactDir)
  assert.equal(released, true)
  await assert.rejects(access(materializedArtifactDir))
})
