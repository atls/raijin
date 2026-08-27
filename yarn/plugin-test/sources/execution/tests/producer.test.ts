import type { TestProducerMessage } from '../ipc.js'

import assert                       from 'node:assert/strict'
import { fork }                     from 'node:child_process'
import { once }                     from 'node:events'
import { mkdtemp }                  from 'node:fs/promises'
import { rm }                       from 'node:fs/promises'
import { writeFile }                from 'node:fs/promises'
import { tmpdir }                   from 'node:os'
import { join }                     from 'node:path'
import { test }                     from 'node:test'
import { fileURLToPath }            from 'node:url'

import { getPluginConfiguration }   from '@yarnpkg/cli'
import { npath }                    from '@yarnpkg/fslib'
import { Cli }                      from 'clipanion'

import { TEST_EXECUTION_CHANNEL }   from '../ipc.js'
import { ProducerCommand }          from '../producer.command.js'
import { TEST_PRODUCER_PATH }       from '../producer.js'
import { plugin }                   from '../../test.plugin.js'
import { isTestProducerMessage }    from '../ipc.js'
import { createProjectTestResult }  from '../result.js'

const producerEntry = fileURLToPath(new URL('./producer.fixture.ts', import.meta.url))

const executeProducer = async (cwd: string, request: object) => {
  const environment = { ...process.env }

  delete environment.NODE_TEST_CONTEXT
  delete environment.NODE_TEST_WORKER_ID

  const child = fork(producerEntry, [...TEST_PRODUCER_PATH], {
    cwd,
    env: environment,
    execArgv: process.execArgv,
    serialization: 'advanced',
    silent: true,
  })
  const messages: Array<TestProducerMessage> = []
  const stderr: Array<Buffer> = []
  const stdout: Array<Buffer> = []

  child.stderr?.on('data', (chunk: Buffer) => stderr.push(chunk))
  child.stdout?.on('data', (chunk: Buffer) => stdout.push(chunk))
  child.on('message', (message) => {
    if (isTestProducerMessage(message)) {
      messages.push(message)
    }
  })
  child.send(request)

  const [exitCode, signal] = await once(child, 'exit')

  return {
    exitCode: exitCode as number | null,
    messages,
    signal: signal as NodeJS.Signals | null,
    stderr: Buffer.concat(stderr).toString(),
    stdout: Buffer.concat(stdout).toString(),
  }
}

test('keeps the producer entry out of Clipanion help and definitions', () => {
  const cli = Cli.from([ProducerCommand], {
    binaryName: 'yarn',
    enableColors: false,
  })

  assert.equal(cli.definition(ProducerCommand), null)
  assert.deepEqual(cli.definitions(), [])
  assert.doesNotMatch(cli.usage(), /raijin test producer/)

  const command = cli.process({
    context: {
      cwd: npath.toPortablePath(process.cwd()),
      plugins: getPluginConfiguration(),
      quiet: false,
    },
    input: [...TEST_PRODUCER_PATH],
  })

  assert.equal(command instanceof ProducerCommand, true)
})

test('keeps the producer entry out of the normal plugin command surface', () => {
  assert.equal(plugin.commands?.includes(ProducerCommand), false)
})

test('reads TestsStream in the producer and returns structured IPC events', async (context) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-test-producer-'))
  const testFile = join(cwd, 'passing.test.mjs')

  context.after(async () => rm(cwd, { force: true, recursive: true }))

  await writeFile(
    testFile,
    [
      "import assert from 'node:assert/strict'",
      "import { test } from 'node:test'",
      "test('passes', () => assert.equal(1, 1))",
    ].join('\n')
  )

  const result = await executeProducer(cwd, {
    channel: TEST_EXECUTION_CHANNEL,
    input: {
      concurrency: true,
      execArgv: [],
      files: [testFile],
      projectCwd: cwd,
      reporter: 'spec',
      testTimeoutMs: 1_000,
      watch: false,
    },
    type: 'execute',
  })

  assert.equal(result.signal, null)
  assert.equal(result.exitCode, 0, result.stderr)
  assert.equal(result.stderr, '')
  assert.equal(
    result.messages.some((message) => message.type === 'completed'),
    true
  )
  assert.match(result.stdout, /passes/)
  assert.equal(
    result.messages.some(
      (message) =>
        message.type === 'event' &&
        message.event.type === 'test:summary' &&
        message.event.data.file === undefined &&
        message.event.data.success
    ),
    true
  )
})

test('maps the real producer failed IPC message to provider failure', async (context) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-test-producer-'))

  context.after(async () => rm(cwd, { force: true, recursive: true }))

  const producer = await executeProducer(cwd, {
    channel: TEST_EXECUTION_CHANNEL,
    input: { concurrency: 'invalid' },
    type: 'execute',
  })
  const result = createProjectTestResult({
    exitCode: producer.exitCode ?? 1,
    messages: producer.messages,
    reason: 'output-failed',
    stderr: producer.stderr,
    stdout: producer.stdout,
  })

  assert.equal(producer.signal, null)
  assert.equal(producer.exitCode, 1)
  assert.equal(producer.stderr, '')
  assert.equal(
    producer.messages.some((message) => message.type === 'failed'),
    true
  )
  assert.equal(result.reason, 'provider-failed')
  assert.deepEqual(result.detail, {
    message: 'Managed test execution received an invalid IPC request',
    stage: 'producer',
  })
})
