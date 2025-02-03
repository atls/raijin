import { NodeWorkflow } from "@angular-devkit/schematics/tools";
import { UnsuccessfulWorkflowExecution } from "@angular-devkit/schematics";
import { SchematicEngine } from "@angular-devkit/schematics";
import { DryRunEvent } from "@angular-devkit/schematics";
import { NodeJsSyncHost } from "@angular-devkit/core/node";
import { existsSync } from "fs";
import { virtualFs, normalize, schema } from "@angular-devkit/core";
import { eventsLogHelper } from "./events-log.helper.js";

const collectionPath =
  "/home/operator/Projects/atls_raijin/yarn/plugin-schematics/sources/collection/hello/collection.json";

export const runSchematicHelper = async (
  schematicName: string,
  options: object,
  collectionName: string
) => {
  const workflow = new NodeWorkflow(process.cwd(), {
    force: false,
    dryRun: false,
    resolvePaths: [process.cwd(), import.meta.dirname],
    // schemaValidation: true,
    packageManager: "yarn",
  });

  let nothingDone = true;
  const debug = false;

  const dryRun = false;
  const dryRunPresent = false;

  workflow.reporter.subscribe((event) => {
    nothingDone = false;
    eventsLogHelper(event);
  });

  try {
    await workflow
      .execute({
        // collection: collectionName,
        collection: collectionPath,
        schematic: schematicName,
        options: {},
        allowPrivate: true,
        debug: false,
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

    console.log("after schematic success run");

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
