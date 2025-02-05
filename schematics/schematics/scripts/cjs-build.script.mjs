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

const dir = fileURLToPath(new URL(".", import.meta.url));
const srcDir = join(dir, "../src/");
const outDir = join(dir, "../dist/");

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

function ensureDirStructure(filePath) {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
}

const allFiles = getAllFiles(srcDir);

const tsJsFiles = allFiles.filter((file) =>
  [".ts", ".js"].includes(extname(file))
);

console.log(tsJsFiles);
await esbuild.build({
  // bundle: true,
  entryPoints: tsJsFiles,
  outdir: outDir,
  outbase: "src",
  format: "cjs",
  platform: "node",
  sourcemap: false,
  target: "esnext",
});

getAllFiles(outDir).forEach((file) => {
  if (extname(file) === ".js") {
    const newPath = join(dirname(file), `${basename(file, ".js")}.cjs`);
    renameSync(file, newPath);
  }
});

allFiles.forEach((file) => {
  if (extname(file) === ".json") {
    const relativePath = relative(srcDir, file);
    const destPath = join(outDir, relativePath);
    ensureDirStructure(destPath);
    copyFileSync(file, destPath);
  }
});

getAllFiles(outDir).forEach((file) => {
  if (extname(file) === ".cjs") {
    let content = readFileSync(file, "utf8");
    content = content.replace(/(\.js)(['"])/g, ".cjs$2");
    writeFileSync(file, content);
  }
});

console.info("schematic build successed");
