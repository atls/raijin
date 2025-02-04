import { apply, url, template, move } from "@angular-devkit/schematics";
import { strings } from "@angular-devkit/core";
import { chain } from "@angular-devkit/schematics";
import { mergeWith } from "@angular-devkit/schematics";
import { MergeStrategy } from "@angular-devkit/schematics";
import { normalize } from "@angular-devkit/core";
import type { Rule } from "@angular-devkit/schematics";

import tsconfig from "@atls/config-typescript";
import { updateTsConfigInTree } from "../utils/index.js";

const generateTestFile = (): Rule => {
  return (tree, context) => {
    const workflow = context.engine.workflow;
    const currentDir = process.cwd();
    // const currentDir = "./";

    const fullPath = normalize(`${currentDir}/hi/hello.txt`);
    // const fullPath = normalize(`./hi/hello.txt`);
    console.info("Normalized path:", fullPath);

    tree.create(fullPath, "Hello, world123!");

    // Логирование всех действий
    tree.actions.forEach((action) => {
      console.log("ACTION Path:", action.path);
      console.log(
        "ACTION Content:",
        action.content?.toString().substring(0, 50)
      );
    });

    return tree;
  };
};

const updateTsConfig = updateTsConfigInTree({
  ...tsconfig.compilerOptions,
  module: "esnext",
});

export const main = (options): Rule => {
  return chain([generateTestFile(), updateTsConfig]);
};
