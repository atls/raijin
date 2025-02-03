import { NodeWorkflow } from "@angular-devkit/schematics/tools";
import { UnsuccessfulWorkflowExecution } from "@angular-devkit/schematics";
import { SchematicEngine } from "@angular-devkit/schematics";
import { DryRunEvent } from "@angular-devkit/schematics";
import { NodeJsSyncHost } from "@angular-devkit/core/node";
import { existsSync } from "fs";
import { virtualFs, normalize, schema } from "@angular-devkit/core";

const collectionPath =
  "/home/operator/Projects/atls_raijin/yarn/plugin-schematics/sources/collection/hello/collection.json";

export const runSchematicHelper = async (
  schematicName: string,
  options: object,
  collectionName: string
) => {
  const workflow = new NodeWorkflow(process.cwd(), {
    force: true,
    dryRun: true,
    resolvePaths: [process.cwd(), import.meta.dirname],
    schemaValidation: true,
    packageManager: "yarn",
  });

  let nothingDone = true;
  let loggingQueue: string[] = [];
  let error = false;
  const debug = true;

  const dryRun = true;
  const dryRunPresent = true;
  const allowPrivate = true;

  workflow.reporter.subscribe((event) => {
    nothingDone = false;
    // Strip leading slash to prevent confusion.
    // const eventPath = removeLeadingSlash(event.path);
    const eventPath = event.path;

    switch (event.kind) {
      case "error":
        error = true;
        console.error(
          `ERROR! ${eventPath} ${
            event.description == "alreadyExist"
              ? "already exists"
              : "does not exist"
          }.`
        );
        break;
      case "update":
        console.debug(
          `${"UPDATE"} ${eventPath} (${event.content.length} bytes)`
        );
        break;
      case "create":
        console.debug(
          `${"CREATE"} ${eventPath} (${event.content.length} bytes)`
        );
        break;
      case "delete":
        console.debug(`${"DELETE"} ${eventPath}`);
        break;
      case "rename":
        console.debug(`${"RENAME"} ${eventPath} => ${event.to}`);
        break;
    }
  });

  try {
    await workflow
      .execute({
        // collection: collectionName,
        collection: collectionPath,
        schematic: schematicName,
        options: {},
        allowPrivate: allowPrivate,
        debug: debug,
        // logger: console.log,
      })
      .toPromise();

    if (nothingDone) {
      console.info("Nothing to be done.");
    } else if (dryRun) {
      console.info(
        `Dry run enabled${
          dryRunPresent ? "" : " by default in debug mode"
        }. No files written to disk.`
      );
    }

    return 0;
  } catch (err) {
    if (err instanceof UnsuccessfulWorkflowExecution) {
      // "See above" because we already printed the error.
      console.debug("The Schematic workflow failed. See above.");
    } else if (debug && err instanceof Error) {
      console.debug(`An error occured:\n${err.stack}`);
    } else {
      console.debug(`Error: ${err instanceof Error ? err.message : err}`);
    }

    return 1;
  }
};
