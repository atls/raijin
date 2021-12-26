import { useEffect } from 'react'

export const SubmitResult = ({ onSubmit, ...props }) => {
  useEffect(() => {
    onSubmit(props)
  }, [props, onSubmit])

  return null
}
