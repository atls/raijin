import { generateSchematic } from "@atls/code-schematics";

const SCHEMATIC_DIR = "src/schematic";
const OUTPUT_FILE = "src/generated/schematic-export.ts";

try {
  generateSchematic(SCHEMATIC_DIR, OUTPUT_FILE);
  console.info("Schematic build successed");
} catch (e: unknown) {
  const error = e as Error;

  console.error("Schematic build error!");
  console.error(error);
}
