import type { ProjectCommandContext }   from '@atls/raijin/commands'
import type { SubmitInjectedComponent } from '@yarnpkg/libui/sources/misc/renderForm.js'
import type { ReactElement }            from 'react'

import type { CommitMessageInput }      from './input.js'

import { BaseCommand }                  from '@yarnpkg/cli'
import { npath }                        from '@yarnpkg/fslib'
import { xfs }                          from '@yarnpkg/fslib'
import { renderForm }                   from '@yarnpkg/libui/sources/misc/renderForm.js'
import { Option }                       from 'clipanion'
import { forceStdinTty }                from 'force-stdin-tty'
import { useStdin }                     from 'ink'
import { useEffect }                    from 'react'
import { useState }                     from 'react'
import React                            from 'react'

import { RequestCommitMessage }         from './prompt/form.jsx'
import { createCommitMessagePolicy }    from './policy.js'
import { prepareCommitMessage }         from './prepare.js'

const RequestCommitMessageSubmit = ({
  commit,
  useSubmit,
}: {
  commit: CommitMessageInput
  useSubmit: (commit: CommitMessageInput) => void
}): null => {
  const { stdin } = useStdin()

  useSubmit(commit)

  useEffect(() => {
    stdin?.emit('keypress', '', { name: 'return' })
  }, [stdin])

  return null
}

interface RequestCommitMessageAppInput {
  allowedScopes: Array<string>
  initialValue?: CommitMessageInput
}

interface RequestCommitMessageAppProps extends RequestCommitMessageAppInput {
  useSubmit: (commit: CommitMessageInput) => void
}

const RequestCommitMessageApp = ({
  allowedScopes,
  initialValue,
  useSubmit,
}: RequestCommitMessageAppProps): ReactElement => {
  const [commit, setCommit] = useState<CommitMessageInput>()

  if (!commit) {
    return (
      <RequestCommitMessage
        allowedScopes={allowedScopes}
        initialValue={initialValue}
        onSubmit={setCommit}
      />
    )
  }

  return <RequestCommitMessageSubmit commit={commit} useSubmit={useSubmit} />
}

const bindRequestCommitMessageApp = ({
    allowedScopes,
    initialValue,
  }: RequestCommitMessageAppInput): SubmitInjectedComponent<CommitMessageInput> =>
  ({ useSubmit }) => (
    <RequestCommitMessageApp
      allowedScopes={allowedScopes}
      initialValue={initialValue}
      useSubmit={useSubmit}
    />
  )

export class CommitMessageCommand extends BaseCommand {
  static override paths = [['commit', 'message']]

  static override usage = BaseCommand.Usage({
    description: 'create a conventional commit message interactively',
  })

  args: Array<string> = Option.Rest({ required: 0 })

  declare context: ProjectCommandContext

  executeBeforeInvocation(): number | undefined {
    const [commitMessageFile, source] = this.args

    if (source) {
      return 0
    }

    if (!commitMessageFile) {
      throw new Error('Commit edit message file required.')
    }

    return undefined
  }

  override async execute(): Promise<number> {
    const [commitMessageFile] = this.args

    if (!commitMessageFile) {
      throw new Error('Commit edit message file required.')
    }

    const policy = createCommitMessagePolicy(this.context.invocation.project)

    const overwroteStdin = forceStdinTty()

    try {
      const message = await prepareCommitMessage({
        policy,
        prompt: async (initialValue) =>
          renderForm(
            bindRequestCommitMessageApp({
              allowedScopes: policy.allowedScopes,
              initialValue,
            }),
            {},
            {
              stdin: process.stdin,
              stdout: this.context.stdout,
              stderr: this.context.stderr,
            }
          ),
        writeDiagnostics: (output) => this.context.stderr.write(output),
      })

      if (!message) {
        return 1
      }

      await xfs.writeFilePromise(npath.toPortablePath(commitMessageFile), message)

      return 0
    } finally {
      if (overwroteStdin) {
        process.stdin.destroy()
      }
    }
  }
}
