import type { WorkspaceCommandContext } from '@atls/raijin/commands'
import type { Workspace }               from '@yarnpkg/core'
import type { PortablePath }            from '@yarnpkg/fslib'

import assert                           from 'node:assert/strict'
import { PassThrough }                  from 'node:stream'
import { test }                         from 'node:test'

import { Configuration }                from '@yarnpkg/core'
import { Manifest }                     from '@yarnpkg/core'
import { npath }                        from '@yarnpkg/fslib'

import { ImagePackCommand }             from '../image-pack.command.js'

const capture = (stream: PassThrough): (() => string) => {
  let output = ''

  stream.setEncoding('utf8')
  stream.on('data', (chunk: string) => {
    output += chunk
  })

  return () => output
}

test('should reject direct publication for an ineligible workspace', async () => {
  const command = new ImagePackCommand()
  const stdout = new PassThrough()
  const readOutput = capture(stdout)
  const configuration = await Configuration.create(npath.toPortablePath(process.cwd()))
  const workspace = {
    manifest: Manifest.fromText(
      JSON.stringify({
        name: '@app/library',
        scripts: {
          build: 'tsc -b',
        },
      })
    ),
    relativeCwd: 'packages/library' as PortablePath,
  } as Workspace
  let processExecutions = 0

  command.publish = true
  command.json = true
  command.context = {
    invocation: {
      executionCwd: npath.toPortablePath(process.cwd()),
      process: {
        execute: () => {
          processExecutions += 1
          throw new Error('Process execution must not start for an ineligible workspace.')
        },
      },
      workspace,
      yarn: {
        configuration,
        project: {},
      },
    },
    stdout,
  } as unknown as WorkspaceCommandContext

  const exitCode = await ImagePackCommand.prototype.execute.call(command)
  const output = readOutput()
  const diagnostic = 'Workspace @app/library is not eligible for image publication.'

  assert.equal(exitCode, 1)
  assert.equal(output.split(diagnostic).length - 1, 1)
  assert.equal(processExecutions, 0)
})
