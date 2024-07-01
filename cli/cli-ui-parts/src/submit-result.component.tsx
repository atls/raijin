import { useEffect } from 'react'

// @ts-expect-error any
export const SubmitResult = ({ onSubmit, ...props }) => {
  useEffect(() => {
    onSubmit(props)
  }, [props, onSubmit])

  return null
}
