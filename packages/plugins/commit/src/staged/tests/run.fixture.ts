import { npath }               from '@yarnpkg/fslib'

import { CommitStagedCommand } from '../command.js'

const command = new CommitStagedCommand()

Object.assign(command, {
  context: {
    stderr: process.stderr,
    invocation: { executionCwd: npath.toPortablePath(process.cwd()) },
  },
})

process.exitCode = await command.execute()
