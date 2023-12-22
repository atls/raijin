import { SubmitInjectedComponent } from '@yarnpkg/libui/sources/misc/renderForm'

import React                       from 'react'
import { FC }                      from 'react'
// @ts-ignore
import { useStdin }                from 'ink'
import { useEffect }               from 'react'
import { useState }                from 'react'

const SubmitProxy = ({ value, useSubmit }) => {
  const { stdin } = useStdin()

  useSubmit(value)

  useEffect(() => {
    stdin?.emit('keypress', '', { name: 'return' })
  }, [stdin])

  return null
}

export const SubmitInjectedComponentFactory = <T,>(InjectedComponent) => {
  // @ts-ignore
  const SubmitCmp: FC<SubmitInjectedComponent<T>> = ({ useSubmit }) => {
    const [value, setValue] = useState<T>()

    if (!value) {
      return <InjectedComponent onSubmit={setValue} />
    }

    return <SubmitProxy value={value} useSubmit={useSubmit} />
  }

  return SubmitCmp
}
