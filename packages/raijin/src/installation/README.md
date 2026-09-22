# Installation

Installs the selected package and matching checked runtime through native Yarn and release metadata. The installation verifies identity before activating the runtime and delegates repository hooks to the package's Husky entrypoint in `hooks/`.

The installed integration test covers new and existing project layouts, update behavior and failure preservation. Its injected release metadata proves local installation behavior, not registry publication.

Run `yarn test unit --target packages/raijin/src/installation` and `yarn test integration --target packages/raijin/src/installation`.
