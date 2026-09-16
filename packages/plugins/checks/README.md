# Pull-request verification

`yarn checks run --since <ref>` selects workspaces changed since an available
Git comparison ref through Yarn's native change detection, then includes their
recursive workspace dependents. The checkout must contain the ref and enough
history for a merge base with `HEAD`; an invalid comparison fails rather than
silently checking an empty set.

If Yarn selects the top-level workspace, Raijin runs one full-project policy
check. This covers changes to shared root configuration without checking the
same project once per workspace. Otherwise, selected workspaces receive
verify-only Format, Lint, unit, and integration checks. TypeCheck uses each
selected workspace's native TypeScript project configuration. Workspaces sharing
one resolved `tsconfig.json` check that complete TypeScript project once,
including its roots and references.

The command does not modify source files or create GitHub Check Runs. GitHub
Actions supplies the comparison ref and displays the ordinary command output
and job result. Without `--since`, `yarn checks run` verifies the full active
project using the same no-write policy. Release/version operations are not
part of this check suite.
