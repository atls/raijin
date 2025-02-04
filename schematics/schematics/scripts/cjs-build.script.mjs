import esbuild from "esbuild";
import {
  readdirSync,
  renameSync,
  statSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { fileURLToPath } from "url";
import { join, extname, basename, dirname, relative } from "path";

// Исходная и выходная папки
const dir = fileURLToPath(new URL(".", import.meta.url));
const srcDir = join(dir, "../src/");
const outDir = join(dir, "../dist/");

// Рекурсивный поиск всех файлов в директории
function getAllFiles(dir, fileList = []) {
  readdirSync(dir).forEach((file) => {
    const fullPath = join(dir, file);
    if (statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  });
  return fileList;
}

// Создаём структуру директорий в `dist`
function ensureDirStructure(filePath) {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
}

// Получаем все файлы из `src/`
const allFiles = getAllFiles(srcDir);

// Отфильтровываем `.ts` и `.js` файлы
const tsJsFiles = allFiles.filter((file) =>
  [".ts", ".js"].includes(extname(file))
);

// Компилируем их с помощью ESBuild
console.log(tsJsFiles);
await esbuild.build({
  entryPoints: tsJsFiles,
  outdir: outDir,
  outbase: "src",
  format: "cjs",
  platform: "node",
  sourcemap: false,
  target: "esnext",
});

// Переименовываем `.js` файлы в `.cjs`
getAllFiles(outDir).forEach((file) => {
  if (extname(file) === ".js") {
    const newPath = join(dirname(file), `${basename(file, ".js")}.cjs`);
    renameSync(file, newPath);
  }
});

// Копируем `.json` файлы без изменений, сохраняя структуру директорий
allFiles.forEach((file) => {
  if (extname(file) === ".json") {
    const relativePath = relative(srcDir, file); // Получаем относительный путь
    const destPath = join(outDir, relativePath); // Создаем путь в dist
    ensureDirStructure(destPath); // Убедимся, что директория существует
    copyFileSync(file, destPath); // Копируем файл
  }
});

// 🔥 Исправляем динамические импорты `import('./file.js')` → `import('./file.cjs')`
getAllFiles(outDir).forEach((file) => {
  if (extname(file) === ".cjs") {
    let content = readFileSync(file, "utf8");

    // Заменяем `import('./module.js')` на `import('./module.cjs')`
    content = content.replace(/(import$['"]\.\/.*?)(\.js)(['"]$)/g, "$1.cjs$3");

    writeFileSync(file, content);
  }
});

console.log(
  "✅ Все файлы сконвертированы в `.cjs`, `.json` остались без изменений."
);
console.log(
  '✅ Динамические импорты `import("./file.js")` заменены на `import("./file.cjs")`.'
);
