import angularSchematicsPkg from "@angular-devkit/schematics";
import { NodeJsSyncHost } from "@angular-devkit/core/node";
import { virtualFs, normalize, schema } from "@angular-devkit/core";
import { CollectionDescription } from "@angular-devkit/schematics/src/engine/interface";
import * as fs from "fs";

const { SchematicEngine, NodeWorkflow, DryRunEvent, workflow } =
  angularSchematicsPkg;

export const runSchematicHelper = async (
  schematicName: string,
  options: object,
  collectionPath: string
) => {
  // Создаём файловую систему
  const host = new virtualFs.ScopedHost(new NodeJsSyncHost());
  const root = normalize(process.cwd());

  // Создаём workflow
  const workflow = new NodeWorkflow(host, {
    resolvePaths: [process.cwd()],
    force: false,
  });

  // Подключаем collection.json
  const engine = new SchematicEngine<CollectionDescription<{}>, {}>(
    new (class implements schema.SchemaValidator {
      validate() {
        return [];
      }
    })(),
    {}
  );

  const collection = engine.createCollection(collectionPath);
  const schematic = collection.createSchematic(schematicName);

  // Запускаем выполнение схемы
  const dryRun = false;
  const recorder = (event: DryRunEvent) => {
    if (event.kind === "error") {
      console.error(`ERROR: ${event.description}`);
    } else if (event.kind === "update") {
      console.log(`UPDATE: ${event.path}`);
    }
  };

  workflow.reporter.subscribe(recorder);

  await schematic
    .call(options, workflow)
    .then(() => console.log("Схема успешно выполнена!"))
    .catch((err) => console.error("Ошибка:", err));
};
