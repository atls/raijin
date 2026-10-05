# Workspace version inference

`yarn release version infer` recommends a bump for each named, public workspace
from its commits after the latest package tag. Conventional Changelog owns the
commit interpretation: breaking changes select `major`, features select
`minor`, and other package commits select `patch`. Several commits produce one
decision per workspace.

Yarn's dependency rules add a patch decision for public workspaces that depend
on a releasing workspace, including transitive dependents. Explicit Yarn
decisions still take precedence; private dependents receive `decline`.

The command writes only missing Yarn deferred version decisions. Existing
`.yarn/versions` records, including `decline` and exact versions, take
precedence. `--dry-run` prints recommendations without changing the project.

An untagged package keeps its manifest version for its first publication. A
workspace whose manifest version is ahead of its latest tag has a pending
release and is not bumped again. A manifest version behind its latest tag is
rejected. The checkout needs complete package-tag history.

If a tagged package moved to a different path, path-limited Git history is
insufficient to infer its bump. The command stops without writing a decision;
record an explicit Yarn version decision for that move.

Yarn applies recorded versions and publishes packages. The shared release
workflow owns changelogs, GitHub Releases, and retries; this plugin does not
repeat those mechanisms.
