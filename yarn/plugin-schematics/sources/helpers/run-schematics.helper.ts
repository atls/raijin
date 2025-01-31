import { NodeWorkflow } from "@angular-devkit/schematics/tools";
import angularSchematicsPkg from "@angular-devkit/schematics";
import { NodeJsSyncHost } from "@angular-devkit/core/node";
import { virtualFs, normalize, schema } from "@angular-devkit/core";
import path from "path";
import { formats } from "@angular-devkit/schematics";
import { CollectionDescription } from "@angular-devkit/schematics/src/engine/interface";
import * as fs from "fs";

import { dirname } from "node:path";
import { join } from "node:path";

const { SchematicEngine, DryRunEvent, workflow } = angularSchematicsPkg;

export const runSchematicHelper = async (
  schematicName: string,
  options: object,
  collectionPath: string
) => {
  // Создаём файловую систему
  const fsHost = new virtualFs.ScopedHost(new NodeJsSyncHost());
  // TODO перебросить сверху, кажется там объявляем аналогичную переменную
  const root = normalize(process.cwd());

  const workflow = new NodeWorkflow(fsHost, {
    force: false,
    dryRun: true,
    packageManager: "yarn",
    root: normalize(root),
    // registry: new schema.CoreSchemaRegistry(formats.standardFormats),
  });

  const engine = new SchematicEngine(fsHost, workflow);
  console.log("engine");

  const collection = workflow.engine.createCollection(
    // TODO path
    "/home/operator/Projects/atls_raijin/yarn/plugin-schematics/sources/collection/dist/collection.json"
  );
  console.log("agter collection");

  // TODO ошибка здесь. не может импоритровать пакет, потомучто использует require esm-модуля
  const schematic = collection.createSchematic(schematicName);
  console.log("schematic");

  // console.log("run schematics helper 5");
  // // Запускаем выполнение схемы
  // const dryRun = false;
  // const recorder = (event: DryRunEvent) => {
  //   if (event.kind === "error") {
  //     console.error(`ERROR: ${event.description}`);
  //   } else if (event.kind === "update") {
  //     console.log(`UPDATE: ${event.path}`);
  //   }
  // };
  //
  // console.log("run schematics helper 6");
  // workflow.reporter.subscribe(recorder);
  //
  // console.log("run schematics helper 7");
  // await schematic
  //   .call(options, workflow)
  //   .then(() => console.log("Схема успешно выполнена!"))
  //   .catch((err) => console.error("Ошибка:", err));
};
