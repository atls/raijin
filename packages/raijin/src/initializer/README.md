# Initializer

Parses the public initializer's install, update and scaffold inputs. It selects the project and delegates package/runtime installation to `../installation`; project generation stays in `../generation/project`.

Bare `--help` and `-h` print usage without initializing files. Invalid arguments fail without starting installation.

Run `yarn test unit --target packages/raijin/src/initializer` for argument behavior and `yarn test integration --target packages/raijin/src/installation` for the installed initializer.
