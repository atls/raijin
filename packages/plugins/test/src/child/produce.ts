import type { ProjectTestEvent }  from '../project/event.js'

import { BaseCommand }            from '@yarnpkg/cli'

import { TEST_EXECUTION_CHANNEL } from './protocol.js'
import { TEST_PRODUCER_PATH }     from './protocol.js'
import { reportTests }            from '../node/report.js'
import { runTests }               from '../node/run.js'
import { disconnectTestChild }    from './ipc.js'
import { receiveTestRequest }     from './ipc.js'
import { sendTestMessage }        from './ipc.js'

const publishEvents = async function* publishTestEvents(
  events: AsyncGenerator<ProjectTestEvent, void>
): AsyncGenerator<ProjectTestEvent, void> {
  for await (const event of events) {
    await sendTestMessage({ channel: TEST_EXECUTION_CHANNEL, event, type: 'event' })

    yield event
  }
}

export const runTestProducer = async (): Promise<number> => {
  try {
    const request = await receiveTestRequest()

    await reportTests(publishEvents(runTests(request.input)), request.input.reporter)
    await sendTestMessage({ channel: TEST_EXECUTION_CHANNEL, type: 'completed' })

    return 0
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error))

    if (process.connected) {
      await sendTestMessage({
        channel: TEST_EXECUTION_CHANNEL,
        error: { message: failure.message, stack: failure.stack },
        type: 'failed',
      })
    }

    return 1
  } finally {
    disconnectTestChild()
  }
}

export class ProducerCommand extends BaseCommand {
  static override paths = [[...TEST_PRODUCER_PATH]]

  override async execute(): Promise<number> {
    return runTestProducer()
  }
}
