import type { FC }                        from 'react'

import type { CommitMessageInput }        from '../input.js'
import type { AdditionalProperties }      from './additional.jsx'

import { useEffect }                      from 'react'
import { useState }                       from 'react'
import React                              from 'react'

import { RequestCommitMessageAdditional } from './additional.jsx'
import { RequestCommitMessageBody }       from './body.jsx'
import { RequestCommitMessageBreaking }   from './breaking.jsx'
import { RequestCommitMessageIssues }     from './issues.jsx'
import { RequestCommitMessageScope }      from './scope.jsx'
import { RequestCommitMessageSubject }    from './subject.jsx'
import { RequestCommitMessageType }       from './type.jsx'

interface SubmitProps extends CommitMessageInput {
  onSubmit: (value: CommitMessageInput) => void
}

const Submit: FC<SubmitProps> = ({ onSubmit, ...props }): null => {
  useEffect(() => {
    onSubmit(props)
  }, [props, onSubmit])

  return null
}

interface RequestCommitMessageProps {
  allowedScopes: Array<string>
  initialValue?: CommitMessageInput
  onSubmit: (props: CommitMessageInput) => void
}

export const RequestCommitMessage: FC<RequestCommitMessageProps> = ({
  allowedScopes,
  initialValue,
  onSubmit,
}) => {
  const [type, setType] = useState<string | undefined>()
  const [scope, setScope] = useState<string | undefined>()
  const [subject, setSubject] = useState<string | undefined>()
  const [issues, setIssues] = useState<string | undefined>()
  const [body, setBody] = useState<string | undefined>()
  const [breaking, setBreaking] = useState<string | undefined>()
  const [additional, setAdditional] = useState<AdditionalProperties>()

  if (!type) {
    return <RequestCommitMessageType initialValue={initialValue?.type} onSubmit={setType} />
  }

  if (!subject) {
    return (
      <RequestCommitMessageSubject initialValue={initialValue?.subject} onSubmit={setSubject} />
    )
  }

  if (!additional) {
    return <RequestCommitMessageAdditional initialValue={initialValue} onSubmit={setAdditional} />
  }

  if (additional.scope && !scope) {
    return (
      <RequestCommitMessageScope
        initialValue={initialValue?.scope}
        scopes={allowedScopes}
        onSubmit={setScope}
      />
    )
  }

  if (additional.issues && !issues) {
    return <RequestCommitMessageIssues initialValue={initialValue?.issues} onSubmit={setIssues} />
  }

  if (additional.body && !body) {
    return <RequestCommitMessageBody initialValue={initialValue?.body} onSubmit={setBody} />
  }

  if (additional.breaking && !breaking) {
    return (
      <RequestCommitMessageBreaking initialValue={initialValue?.breaking} onSubmit={setBreaking} />
    )
  }

  return (
    <Submit
      type={type}
      scope={scope}
      subject={subject}
      issues={issues}
      body={body}
      breaking={breaking}
      skipci={additional.skipci}
      onSubmit={onSubmit}
    />
  )
}
