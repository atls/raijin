# Execution

Runs processes for command invocations without owning workspace selection.

- `node` prepares the managed Node environment and loader, then cleans up its temporary directory
- `process` forwards an ordinary command without treating it as a Node application
- `subprocess` implements the shared Execa execution, output, cancellation and timeout behavior
- `environment` and `yarn` preserve native environment naming and Yarn script setup

Invocation composition supplies the executor and streams. Callers receive the existing execution result, including failed startup, signals and cleanup failures; moving these files does not merge those outcomes.

Run `yarn test unit --target packages/raijin` for the local contracts and package-level process lifecycle tests. The service plugin's installed integration test exercises build, development and production through the checked CLI.
