import assert                        from 'node:assert/strict'
import { test }                      from 'node:test'

import { HostTree }                  from '@angular-devkit/schematics'

import { updateServiceStartScripts } from './start-scripts.js'

test('should update service start scripts to owned service start command', async () => {
  const tree = new HostTree()
  const context = { logger: { info: () => undefined } }

  tree.create(
    '/service/package.json',
    JSON.stringify(
      {
        scripts: {
          build: 'yarn service build',
          dev: 'yarn service dev',
          start: 'yarn node dist/index.js',
        },
      },
      null,
      2
    )
  )
  tree.create(
    '/renderer/package.json',
    JSON.stringify(
      {
        scripts: {
          build: 'yarn renderer build',
          dev: 'yarn renderer dev',
          start: 'yarn node dist/index.js',
        },
      },
      null,
      2
    )
  )

  await updateServiceStartScripts()(tree, context as never)

  assert.deepEqual(JSON.parse(tree.read('/service/package.json')!.toString()).scripts, {
    build: 'yarn service build',
    dev: 'yarn service dev',
    start: 'yarn service start',
  })
  assert.deepEqual(JSON.parse(tree.read('/renderer/package.json')!.toString()).scripts, {
    build: 'yarn renderer build',
    dev: 'yarn renderer dev',
    start: 'yarn renderer start',
  })
})
