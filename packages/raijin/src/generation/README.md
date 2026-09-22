# Generation

Creates project files through the installed Angular collection.

- `project/generate.ts` validates the selected project or library scenario
- `project/scaffolder.ts` loads the installed package's Angular collection through Yarn
- `project/angular` owns the collection, templates and native schematic execution

The generate plugin selects the invocation and presents the result. It does not implement a second scaffold engine.

Run `yarn test unit --target packages/raijin/src/generation` for provider and generation behavior. Run `yarn test integration --target packages/raijin/src/generation/project` to pack the real collection and generate both supported baselines in an installed consumer.
