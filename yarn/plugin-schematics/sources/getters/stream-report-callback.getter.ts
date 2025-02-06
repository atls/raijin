import type { StreamReport } from "@yarnpkg/core";

import { runSchematicHelper } from "../helpers/run-schematics.helper.js";
import "@atls/schematics";

type StreamReportCallbackType = Parameters<typeof StreamReport.start>[1];

const getCollectionPath = () => {

  const collectionUrl = import.meta.resolve("@atls/schematics/collection");
  const collectionPath = new URL(collectionUrl).pathname;

  return collectionPath;
};

export const getStreamReportCallback = (
  options: object
): StreamReportCallbackType => {
  const streamReportCallback = async (report: StreamReport): Promise<void> => {
    const collectionPath = getCollectionPath();
    try {
      await runSchematicHelper("project", options, collectionPath);
    } catch (error) {
      console.error(error);
    }
  };

  return streamReportCallback;
};
