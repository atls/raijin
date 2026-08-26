import type { ProjectCommandContext }              from '@atls/raijin/commands'
import type { PluginConfiguration }                from '@yarnpkg/core'
import type { Workspace }                          from '@yarnpkg/core'
import type { PortablePath }                       from '@yarnpkg/fslib'

import assert                                      from 'node:assert/strict'
import { PassThrough }                             from 'node:stream'
import { test }                                    from 'node:test'

import { Configuration }                           from '@yarnpkg/core'
import { Manifest }                                from '@yarnpkg/core'
import { npath }                                   from '@yarnpkg/fslib'
import { Cli }                                     from 'clipanion'

import { composeCommandInvocations }               from '@atls/raijin/commands'

import { NO_ELIGIBLE_IMAGE_WORKSPACES_DIAGNOSTIC } from '../workspace-eligibility.js'
import { WorkspacesResolveCommand }                from '../workspaces-resolve.command.js'
import { plugin }                                  from '../image.plugin.js'

const capture = (stream: PassThrough): (() => string) => {
  let output = ''

  stream.setEncoding('utf8')
  stream.on('data', (chunk: string) => {
    output += chunk
  })

  return () => output
}

const createWorkspace = (location: string, name: string, build: string): Workspace =>
  ({
    manifest: Manifest.fromText(
      JSON.stringify({
        name,
        scripts: {
          build,
        },
      })
    ),
    relativeCwd: location as PortablePath,
  }) as Workspace

const createCli = (): Cli => {
  const pluginConfiguration: PluginConfiguration = {
    modules: new Map([['@atls/yarn-plugin-image', plugin]]),
    plugins: new Set(['@atls/yarn-plugin-image']),
  }

  composeCommandInvocations(pluginConfiguration)

  const cli = new Cli({
    binaryLabel: 'Yarn',
    binaryName: 'yarn',
    binaryVersion: '0.0.0',
  })

  for (const CommandClass of plugin.commands ?? []) {
    cli.register(CommandClass)
  }

  return cli
}

const execute = async (
  locations: Array<string>,
  workspaces: Array<Workspace>
): Promise<{ exitCode: number; output: string }> => {
  const command = new WorkspacesResolveCommand()
  const stdout = new PassThrough()
  const readOutput = capture(stdout)
  const configuration = await Configuration.create(npath.toPortablePath(process.cwd()))

  command.json = true
  command.locations = locations
  command.context = {
    invocation: {
      yarn: {
        configuration,
        project: {
          workspaces,
        },
      },
    },
    stdout,
  } as unknown as ProjectCommandContext

  const exitCode = await WorkspacesResolveCommand.prototype.execute.call(command)

  return { exitCode, output: readOutput() }
}

test('should parse the image workspace eligibility command surface', () => {
  const command = createCli().process([
    'image',
    'workspaces',
    'resolve',
    '--json',
    'apps/service',
    'apps/renderer',
  ])

  assert.ok(command instanceof WorkspacesResolveCommand)
  assert.equal(command.json, true)
  assert.deepEqual(command.locations, ['apps/service', 'apps/renderer'])
})

test('should report a selected image-eligible workspace', async () => {
  const workspace = createWorkspace('apps/service', '@app/service', 'service build')
  const result = await execute(['apps/service'], [workspace])

  assert.equal(result.exitCode, 0)
  assert.deepEqual(JSON.parse(result.output), {
    eligibleWorkspaces: [{ location: 'apps/service', name: '@app/service' }],
  })
})

test('should retain eligible workspaces from a mixed selection', async () => {
  const service = createWorkspace('apps/service', '@app/service', 'service build')
  const library = createWorkspace('packages/library', '@app/library', 'tsc -b')
  const result = await execute(['packages/library', 'apps/service'], [service, library])

  assert.equal(result.exitCode, 0)
  assert.equal(result.output.trim().split('\n').length, 1)
  assert.deepEqual(JSON.parse(result.output), {
    eligibleWorkspaces: [{ location: 'apps/service', name: '@app/service' }],
  })
})

test('should reject an unknown selected workspace location', async () => {
  const service = createWorkspace('apps/service', '@app/service', 'service build')
  const result = await execute(['apps/missing'], [service])
  const diagnostic = 'Selected workspace locations not found: apps/missing.'

  assert.equal(result.exitCode, 1)
  assert.equal(result.output.split(diagnostic).length - 1, 1)
  assert.equal(result.output.includes(NO_ELIGIBLE_IMAGE_WORKSPACES_DIAGNOSTIC), false)
})

test('should fail once when no selected workspace is image-eligible', async () => {
  const library = createWorkspace('packages/library', '@app/library', 'tsc -b')
  const result = await execute(['packages/library'], [library])
  const diagnosticCount = result.output.split(NO_ELIGIBLE_IMAGE_WORKSPACES_DIAGNOSTIC).length - 1

  assert.equal(result.exitCode, 1)
  assert.equal(diagnosticCount, 1)
})
