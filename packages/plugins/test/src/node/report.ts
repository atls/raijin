import type { TestEvent }        from 'node:test/reporters'

import type { ProjectTestEvent } from '../project/event.js'
import type { TestReporter }     from '../project/input.js'

import { once }                  from 'node:events'
import { Readable }              from 'node:stream'
import { spec }                  from 'node:test/reporters'
import { tap }                   from 'node:test/reporters'

export const reportTests = async (
  events: AsyncGenerator<ProjectTestEvent, void>,
  reporter: TestReporter
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
