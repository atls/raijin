import type { Source } from "@angular-devkit/schematics";

import { apply } from "@angular-devkit/schematics";
import { template } from "@angular-devkit/schematics";
import { move } from "@angular-devkit/schematics";
import { url } from "@angular-devkit/schematics";
import { strings } from "@angular-devkit/core";

export const generateCommonSource = (options: any): Source =>
  apply(url("../templates/common"), [
    template({
      ...strings,
      ...options,
      dot: ".",
    }),
    move("./"),
  ]);
