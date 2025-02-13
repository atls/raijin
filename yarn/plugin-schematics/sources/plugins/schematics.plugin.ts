import type { Plugin }            from '@yarnpkg/core'

import { GenerateProjectCommand } from '../commands/index.js'

import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

// Путь к директории с файлами (из другого пакета)
const SCHEMATICS_PATH = join(import.meta.dirname, "../schematics");

// Функция рекурсивного поиска файлов без расширений
function getAllFiles(dirPath: string): Record<string, string> {
  let files: Record<string, string> = {};

  for (const file of readdirSync(dirPath)) {
    const fullPath = join(dirPath, file);
    if (statSync(fullPath).isDirectory()) {
      Object.assign(files, getAllFiles(fullPath));
    } else {
      const relativePath = relative(SCHEMATICS_PATH, fullPath);
      files[relativePath] = readFileSync(fullPath, "utf-8");
    }
  }

  return files;
}

// Встроенные файлы в бандл
const SCHEMATICS_FILES = getAllFiles(SCHEMATICS_PATH);

export const schematicsPlugin: Plugin = {
	hooks: {
    async afterAllInstalled() {
   console.log("Running schematics build after bundle...");
      console.log("Available schematics files:", Object.keys(SCHEMATICS_FILES));
		}
	},
  commands: [GenerateProjectCommand],
}
