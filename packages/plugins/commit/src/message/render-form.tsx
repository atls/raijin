import type { Readable }      from 'node:stream'
import type { Writable }      from 'node:stream'
import type { ComponentType } from 'react'

import { render }             from 'ink'
import { useApp }             from 'ink'
import { useEffect }          from 'react'
import React                  from 'react'

type SubmitInjectedComponent<Value> = ComponentType<{
  useSubmit: (value: Value) => void
}>

interface RenderFormOptions {
  stderr: Writable
  stdin: Readable
  stdout: Writable
}

export const renderForm = async <Value,>(
  UserComponent: SubmitInjectedComponent<Value>,
  { stdin, stdout, stderr }: RenderFormOptions
): Promise<Value | undefined> => {
  let returnedValue: Value | undefined

  const Form = (): React.ReactElement => {
    const { exit } = useApp()
    const useSubmit = (value: Value): void => {
      useEffect(() => {
        returnedValue = value
        exit()
      }, [exit, value])
    }

    return <UserComponent useSubmit={useSubmit} />
  }

  const application = render(<Form />, {
    stdin: stdin as NodeJS.ReadStream,
    stdout: stdout as NodeJS.WriteStream,
    stderr: stderr as NodeJS.WriteStream,
  })

  await application.waitUntilExit()

  return returnedValue
}

export type { SubmitInjectedComponent }
