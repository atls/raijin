import type { ProjectTestEvent } from '../project/event.js'
import type { TestRunInput }     from '../project/ports/child.js'

import { isAbsolute }            from 'node:path'
import { resolve }               from 'node:path'
import { run }                   from 'node:test'

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

export const runTests = async function* runNodeTests({
  concurrency,
  execArgv,
  files,
  projectCwd,
  testTimeoutMs,
  watch,
}: TestRunInput): AsyncGenerator<ProjectTestEvent, void> {
  const stream = run({
    concurrency,
    execArgv,
    files,
    timeout: testTimeoutMs,
    watch,
  })

  // @types/node 24.12 predates Node 24.15's test:interrupted event.
  for await (const rawEvent of stream as AsyncIterable<ProjectTestEvent>) {
    yield canonicalizeEvent(rawEvent, projectCwd)
  }
}
