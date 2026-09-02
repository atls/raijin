import type { run as runTests }               from 'node:test'

import type { TestProjectInput }              from '../interfaces/input.js'
import type { TestReporter }                  from '../interfaces/input.js'

import { finished }                           from 'node:stream/promises'
import { pipeline }                           from 'node:stream/promises'
import { spec }                               from 'node:test/reporters'
import { tap }                                from 'node:test/reporters'

import { ReporterOutputUnavailableException } from './exceptions/output.js'

export const consumeTestReport = async (
  stream: ReturnType<typeof runTests>,
  reporter: TestReporter,
  stdout: TestProjectInput['stdout']
): Promise<void> => {
  if (reporter === 'silent') {
    stream.resume()
    await finished(stream)

    return
  }

  if (!stdout) {
    throw new ReporterOutputUnavailableException()
  }

  const output = stream.compose(reporter === 'tap' ? tap : spec)

  await pipeline(output, stdout, { end: false })
}
