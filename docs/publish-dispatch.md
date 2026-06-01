# Publish Dispatch

Raijin package releases are produced by the `Publish` workflow after a pull
request is merged into `master`.

Manual `workflow_dispatch` runs are reserved for registry access checks or a
targeted workspace publish. A repository-wide release chain still requires a
merged pull request outside `.github/**`, because the version, changelog,
bundle, release, and follow-up commit steps are gated by the merged pull
request event.
