import { useEffect } from 'react'

// @ts-ignore
export const SubmitResult = ({ onSubmit, ...props }) => {
  useEffect(() => {
    onSubmit(props)
  }, [props, onSubmit])

  return null
}
