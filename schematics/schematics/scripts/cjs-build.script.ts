/* eslint-disable no-console */

import { join } from "path";
import { fileURLToPath } from "url";

import { esbuildBuildStep } from "./build-steps/index.js";
import { renameJsToCjsUtil } from "./utils/index.js";
import { copyTemplatesUtil } from "./utils/index.js";
import { renameJsImportsUtil } from "./utils/index.js";
import { getAllFiles } from "./getters/index.js";

const dir = fileURLToPath(new URL(".", import.meta.url));
const srcDir = join(dir, "../src/");
const outDir = join(dir, "../dist/");

const allFiles = getAllFiles(srcDir);

try {
  await esbuildBuildStep({ allFiles, outDir });
  renameJsToCjsUtil({ outDir });
  copyTemplatesUtil({ srcDir, outDir, allFiles });
  renameJsImportsUtil({ outDir });
} catch (e: unknown) {
  const error = e as Error;

  console.error("Schematic build error!");
  console.error(error.message);
}

console.info("Schematic build successed");
