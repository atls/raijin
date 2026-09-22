# Generation

Creates project files and icon components through the retained providers.

- `project/generate.ts` validates the selected project or library scenario
- `project/scaffolder.ts` loads the installed package's Angular collection through Yarn
- `project/angular` owns the collection, templates and native schematic execution
- `icons/generate.ts` coordinates SVG input, SVGR transformation, output, formatting and linting
- `icons/node`, `icons/svgr` and `icons/yarn` contain those provider implementations

Commands in the generate plugin select the invocation and present the result. They do not implement a second scaffold or SVG parser.

Run `yarn test unit --target packages/raijin/src/generation` for provider and generation behavior. Run `yarn test integration --target packages/raijin/src/generation/project` to pack the real collection and generate both supported baselines in an installed consumer.
