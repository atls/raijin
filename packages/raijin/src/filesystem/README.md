# Filesystem

Contains native-path conversion and file discovery used by project commands. `discovery` selects files; `discovery/glob` delegates matching to fast-glob. Callers retain ownership of selection policy and file mutations.

Run `yarn test unit --target packages/raijin/src/filesystem` for path and discovery cases.
