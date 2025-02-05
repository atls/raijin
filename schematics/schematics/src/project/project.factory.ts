import { apply, url, template, move } from "@angular-devkit/schematics";
import { strings } from "@angular-devkit/core";
import { chain } from "@angular-devkit/schematics";
import { mergeWith } from "@angular-devkit/schematics";
import { MergeStrategy } from "@angular-devkit/schematics";
import { normalize } from "@angular-devkit/core";
import type { Rule } from "@angular-devkit/schematics";
import { updateTsConfigRule } from "../rules/index.js";

export const main = (): Rule => {
  return chain([updateTsConfigRule]);
};
