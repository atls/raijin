import type { FC }                 from 'react'

import { SubmitInjectedComponent } from '@yarnpkg/libui/sources/misc/renderForm.js'
import { useStdin }                from 'ink'
import { useEffect }               from 'react'
import { useState }                from 'react'
import React                       from 'react'

const SubmitProxy = ({ value, useSubmit }: { value: any; useSubmit: Function }) => {
  const { stdin } = useStdin()

  useSubmit(value)

  useEffect(() => {
    stdin?.emit('keypress', '', { name: 'return' })
  }, [stdin])

  return null
}

export const SubmitInjectedComponentFactory = <T,>(InjectedComponent: any) => {
  // @ts-expect-error any
  const SubmitCmp: FC<SubmitInjectedComponent<T>> = ({ useSubmit }) => {
    const [value, setValue] = useState<T>()

    if (!value) {
      return <InjectedComponent onSubmit={setValue} />
    }

    return <SubmitProxy value={value} useSubmit={useSubmit} />
  }

  return SubmitCmp
}
