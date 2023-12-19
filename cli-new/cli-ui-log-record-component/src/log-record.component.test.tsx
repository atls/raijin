import React            from 'react'
import stripAnsi        from 'strip-ansi'

import { renderStatic } from '@atls/cli-ui-renderer-new'

import { LogRecord }    from './log-record.component'

const createStack = () => {
  const cwd = process.cwd()

  return `Error: test
    at Object.<anonymous> (${cwd}/mctl/mctl-ui/src/log/log-record.component.test.tsx:10:12)
    at Object.asyncJestTest (${cwd}/.yarn/cache/jest-jasmine2-npm-26.6.3-aba0c11c28-18b15901f8.zip/node_modules/jest-jasmine2/build/jasmineAsyncInstall.js:106:37)
    at ${cwd}/.yarn/cache/jest-jasmine2-npm-26.6.3-aba0c11c28-18b15901f8.zip/node_modules/jest-jasmine2/build/queueRunner.js:45:12
    at new Promise (<anonymous>)
    at mapper (${cwd}/.yarn/cache/jest-jasmine2-npm-26.6.3-aba0c11c28-18b15901f8.zip/node_modules/jest-jasmine2/build/queueRunner.js:28:19)
    at ${cwd}/.yarn/cache/jest-jasmine2-npm-26.6.3-aba0c11c28-18b15901f8.zip/node_modules/jest-jasmine2/build/queueRunner.js:75:41
    at processTicksAndRejections (internal/process/task_queues.js:93:5)`
}

describe('log record component', () => {
  it('render', () => {
    // @ts-ignore
    const output = renderStatic(<LogRecord name='test' body='message' />, 160)

    expect(stripAnsi(output)).toMatchSnapshot()
  })

  it('render body error stack', () => {
    // @ts-ignore
    const output = renderStatic(<LogRecord name='test' body={{ stack: createStack() }} />, 160)

    expect(stripAnsi(output)).toMatchSnapshot()
  })
})
