# Raijin Release Ownership

This document describes the release and publish boundary implemented by the
release plugin ownership contract.

Raijin release automation must not become a second package manager, release
registry, changelog database, or recovery database. The code contract in
`yarn/plugin-release/sources/release-ownership.contract.ts` defines the owners
that release plan parsing and creation must enforce.

## Owners

### Yarn

Yarn owns package version decisions and package version application.

Raijin may select the changed workspaces that need a version decision, but the
version state must stay in Yarn-native deferred versioning and be applied
through Yarn version commands. Raijin must not keep a separate release-plan
state that can disagree with Yarn.

### GitHub Releases

GitHub Releases owns release records, generated release notes, release tags, and
release assets.

Raijin may upload or verify release assets, but the canonical release record is
the GitHub Release for the package tag. Generated release notes should use the
GitHub release-notes surface instead of Raijin-owned changelog state.

### Registries

NPM and GitHub Packages own published package state.

Raijin may run registry publish commands and verify whether an expected package
version already exists. Raijin must not treat repository files as proof that a
registry publish succeeded.

### Raijin

Raijin owns orchestration and verification.

Raijin is responsible for:

- selecting the release scope from the workflow event and the changed workspace
  contract;
- invoking Yarn, GitHub Releases, NPM, and GitHub Packages in the agreed order;
- committing repository metadata and generated bundle artifacts after external
  side effects are verified;
- making partial publish recovery safe by checking the owner system for every
  side effect before retrying or continuing.

Raijin does not own:

- a custom source of truth for target versions;
- a custom changelog database;
- release records outside GitHub Releases;
- registry state outside NPM or GitHub Packages;
- blind reruns after a partial publish has already created external side
  effects.

## Recovery Contract

A failed publish run must be recovered from owner state, not by recalculating a
new release state.

If a step after external side effects fails, recovery must:

1. Reconstruct the same workflow event scope.
2. Read the expected versions from Yarn-applied repository state or the original
   workflow state.
3. Verify already-created registry packages in NPM and GitHub Packages.
4. Verify already-created GitHub Releases, tags, notes, and assets.
5. Regenerate and commit only missing repository metadata or bundle artifacts.

Recovery must not blindly rerun publish or release creation once package
versions, registry publishes, or GitHub Releases already exist.

## Follow-Up Scope

This contract is the owner reference for the pre-v3 release cleanup issues:

- atls/raijin#672
- atls/raijin#707
- atls/raijin#743
- atls/raijin#744
- atls/raijin#745
- atls/raijin#746
