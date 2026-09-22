# Initializer

Parses the public initializer's install, update and scaffold inputs. It selects the project and delegates package/runtime installation to `../installation`; project generation stays in `../generation/project`.

An existing project must declare `"type": "module"` in `package.json`. The initializer rejects other module modes before package installation, runtime activation, hook installation or scaffold writes.

Bare `--help` and `-h` print usage without initializing files. Invalid arguments fail without starting installation.

Run `yarn test unit --target packages/raijin/src/initializer` for argument behavior and `yarn test integration --target packages/raijin/src/installation` for the installed initializer.
