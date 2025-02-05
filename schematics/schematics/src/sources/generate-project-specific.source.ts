import type { Source } from "@angular-devkit/schematics"
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { apply } from "@angular-devkit/schematics";
import { url } from "@angular-devkit/schematics";
import { template } from "@angular-devkit/schematics";
import { strings } from "@angular-devkit/core";
import { move } from "@angular-devkit/schematics";

export const generateProjectSpecificSource = (options: any): Source => {
  const { name: projectName } = JSON.parse(
    readFileSync(join(options.cwd, "package.json"), "utf-8")
  );

  return apply(url(join("./files", options.type)), [
    template({
      ...strings,
      ...options,
      projectName,
      dot: ".",
    }),
    move("./"),
  ]);
}
