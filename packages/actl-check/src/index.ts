import AllCommand from './commands/check/all'
import CommitLintCommand from './commands/check/commitlint'
import LintCommand from './commands/check/lint'
import ReleaseCommand from './commands/check/release'
import TestCommand from './commands/check/test'
import TypecheckCommand from './commands/check/typecheck'

export {
  AllCommand as CheckAllCommand,
  TypecheckCommand as CheckTypecheckCommand,
  TestCommand as CheckTestCommand,
  ReleaseCommand as CheckReleaseCommand,
  LintCommand as CheckLintCommand,
  CommitLintCommand as CheckCommitLintCommand,
}
