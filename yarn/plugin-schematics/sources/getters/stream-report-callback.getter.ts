import type { StreamReport } from "@yarnpkg/core";

import { join } from "node:path";

import { runSchematicHelper } from "../helpers/run-schematics.helper.js";

type StreamReportCallbackType = Parameters<typeof StreamReport.start>[1];

import { dirname } from "node:path";
import { fileURLToPath } from "url";

export const getStreamReportCallback = (): StreamReportCallbackType => {
  const streamReportCallback = async (report: StreamReport): Promise<void> => {
    // TODO например у линта свой компонент для прогресса. как сделать тут?
    // await report.startTimerPromise("Init Project", async () => {
    //   const progress = new SpinnerProgress(
    //     this.context.stdout,
    //     configuration
    //   );
    //   progress.start();

    // TODO можно както получить путь, импортировав файл из пакета?
    // const content = await readFile(join(this.cwd, "package.json"), "utf-8");

    // const collectionPath = join(
    //   process.cwd(),
    //   "schematics",
    //   "schematics",
    //   "dist",
    //   "collection.json"
    // );

    const collectionUrl = import.meta.resolve("@atls/schematics/collection");
    const collectionPath = new URL(collectionUrl).pathname;

    try {
      await runSchematicHelper("project", {}, collectionPath);

      // const schematics = new SchematicsWorker(project.cwd);

      //     const events = await schematics.generate("project", options);
      //
      //     progress.end();
      //
      //     events.forEach((event: any) => {
      //       const eventPath = event.path.startsWith("/")
      //         ? event.path.slice(1)
      //         : event.path;
      //
      //       if (event.kind === "error") {
      //         report.reportError(
      //           MessageName.UNNAMED,
      //           `${eventPath}: ${event.description}`
      //         );
      //       } else {
      //         report.reportInfo(
      //           MessageName.UNNAMED,
      //           `${eventPath}: ${event.kind}`
      //         );
      //       }
      //     });
      //
      //     await xfs.writeJsonPromise(
      //       npath.toPortablePath(
      //         npath.join(
      //           npath.fromPortablePath(workspace!.cwd),
      //           "package.json"
      //         )
      //       ),
      //       {
      //         ...workspace!.manifest.raw,
      //         tools: {
      //           schematic: {
      //             collection: "@atls/schematics",
      //             schematic: "project",
      //             type: options.type,
      //             migration: String(Date.now()),
      //           },
      //         },
      //       }
      //     );
    } catch (error) {
      console.error(error);
      //     progress.end();
      //
      //     renderStatic(<ErrorInfo error={error as Error} />)
      //       .split("\n")
      //       .forEach((line) => {
      //         report.reportError(MessageName.UNNAMED, line);
      //       });
    }
    // });
  };

  return streamReportCallback;
};
