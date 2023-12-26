import React            from 'react'

import { renderStatic } from '@atls/cli-ui-renderer'

import { StackTrace }   from './stack-trace.component'

const stripAnsi = require('strip-ansi')

const createStack = () => {
  const cwd = process.cwd()

  return `Error: test
    at Object.<anonymous> (${cwd}/actl/actl-ui/src/stack-trace/stack-trace.component.test.tsx:10:12)
    at Object.asyncJestTest (${cwd}/.yarn/cache/jest-jasmine2-npm-26.6.3-aba0c11c28-18b15901f8.zip/node_modules/jest-jasmine2/build/jasmineAsyncInstall.js:106:37)
    at ${cwd}/.yarn/cache/jest-jasmine2-npm-26.6.3-aba0c11c28-18b15901f8.zip/node_modules/jest-jasmine2/build/queueRunner.js:45:12
    at new Promise (<anonymous>)
    at mapper (${cwd}/.yarn/cache/jest-jasmine2-npm-26.6.3-aba0c11c28-18b15901f8.zip/node_modules/jest-jasmine2/build/queueRunner.js:28:19)
    at ${cwd}/.yarn/cache/jest-jasmine2-npm-26.6.3-aba0c11c28-18b15901f8.zip/node_modules/jest-jasmine2/build/queueRunner.js:75:41
    at processTicksAndRejections (internal/process/task_queues.js:93:5)`
}

describe('stack trace component', () => {
  it('render', () => {
    // @ts-ignore
    const output = renderStatic(<StackTrace>{createStack()}</StackTrace>, 160)

    expect(stripAnsi(output)).toMatchSnapshot()
  })
})
