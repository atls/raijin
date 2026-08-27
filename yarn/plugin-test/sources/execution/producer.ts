import type { TestEvent }           from 'node:test/reporters'

import type { ProjectTestEvent }    from './event.js'
import type { TestProducerInput }   from './input.js'
import type { TestProducerMessage } from './ipc.js'
import type { TestProducerRequest } from './ipc.js'

import { once }                     from 'node:events'
import { isAbsolute }               from 'node:path'
import { resolve }                  from 'node:path'
import { Readable }                 from 'node:stream'
import { run }                      from 'node:test'
import { spec }                     from 'node:test/reporters'
import { tap }                      from 'node:test/reporters'
import { fileURLToPath }            from 'node:url'

import { TEST_EXECUTION_CHANNEL }   from './ipc.js'
import { isTestProducerRequest }    from './ipc.js'

export const TEST_PRODUCER_PATH = ['raijin', 'test', 'producer'] as const

const receiveRequest = async (): Promise<TestProducerRequest> => {
  const [message] = await once(process, 'message')

  if (!isTestProducerRequest(message)) {
    throw new Error('Managed test execution received an invalid IPC request')
  }

  return message
}

const send = async (message: TestProducerMessage): Promise<void> => {
  if (!process.send || !process.connected) {
    throw new Error('Managed test execution IPC channel is unavailable')
  }

  await new Promise<void>((resolveMessage, rejectMessage) => {
    process.send!(message, (error) => {
      if (error) {
        rejectMessage(error)
      } else {
        resolveMessage()
      }
    })
  })
}

const canonicalizeEvent = (event: ProjectTestEvent, projectCwd: string): ProjectTestEvent => {
  if (event.type !== 'test:fail' || !event.data.file || isAbsolute(event.data.file)) {
    return event
  }

  return {
    ...event,
    data: {
      ...event.data,
      file: resolve(projectCwd, event.data.file),
    },
  }
}

const observe = async function* observeTests(
  stream: ReturnType<typeof run>,
  projectCwd: string
): AsyncGenerator<ProjectTestEvent, void> {
  // @types/node 24.12 predates Node 24.15's test:interrupted event.
  for await (const rawEvent of stream as AsyncIterable<ProjectTestEvent>) {
    const event = canonicalizeEvent(rawEvent, projectCwd)

    await send({ channel: TEST_EXECUTION_CHANNEL, event, type: 'event' })

    yield event
  }
}

const present = async (
  events: AsyncGenerator<ProjectTestEvent, void>,
  reporter: TestProducerInput['reporter']
): Promise<void> => {
  if (reporter === 'silent') {
    for await (const event of events) {
      if (event.type === 'test:interrupted') {
        continue
      }
    }

    return
  }

  // Node's reporters accept the same stream at runtime; this cast can be removed
  // when @types/node includes test:interrupted.
  const source = events as AsyncGenerator<TestEvent, void>
  const output = reporter === 'tap' ? tap(source) : Readable.from(source).compose(spec)

  for await (const chunk of output) {
    if (!process.stdout.write(chunk)) {
      await once(process.stdout, 'drain')
    }
  }
}

const execute = async ({
  concurrency,
  execArgv,
  files,
  projectCwd,
  reporter,
  testTimeoutMs,
  watch,
}: TestProducerInput): Promise<void> => {
  const stream = run({
    concurrency,
    execArgv,
    files,
    timeout: testTimeoutMs,
    watch,
  })

  await present(observe(stream, projectCwd), reporter)
}

const disconnect = (): void => {
  if (process.connected) {
    process.disconnect()
  }
}

export const runTestProducer = async (): Promise<number> => {
  try {
    const request = await receiveRequest()

    await execute(request.input)
    await send({ channel: TEST_EXECUTION_CHANNEL, type: 'completed' })

    return 0
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error))

    if (process.connected) {
      await send({
        channel: TEST_EXECUTION_CHANNEL,
        error: { message: failure.message, stack: failure.stack },
        type: 'failed',
      })
    }

    return 1
  } finally {
    disconnect()
  }
}

export const resolveTestProducerEntry = (): string => fileURLToPath(import.meta.url)
