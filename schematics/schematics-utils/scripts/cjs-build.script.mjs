import esbuild from 'esbuild'
import {
  readdirSync,
  renameSync,
  statSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
} from 'fs'
import { join, extname, basename, dirname } from 'path'
import { fileURLToPath } from 'node:url'

// Исходная и выходная папки
const dir = fileURLToPath(new URL('.', import.meta.url))
// const srcDir = "src";
const srcDir = join(dir, '../src/')
// const outDir = "dist";
const outDir = join(dir, '../dist/')

// Рекурсивный поиск всех файлов в директории
function getAllFiles(dir, fileList = []) {
  readdirSync(dir).forEach((file) => {
    const fullPath = join(dir, file)
    if (statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, fileList)
    } else {
      fileList.push(fullPath)
    }
  })
  return fileList
}

// Создаём структуру директорий в `dist`
function ensureDirStructure(filePath) {
  const dir = dirname(filePath)
  mkdirSync(dir, { recursive: true })
}

// Получаем все файлы из `src/`
const allFiles = getAllFiles(srcDir)

// Отфильтровываем `.ts` и `.js` файлы
const tsJsFiles = allFiles.filter((file) => ['.ts', '.js'].includes(extname(file)))

// Компилируем их с помощью ESBuild
await esbuild.build({
  entryPoints: tsJsFiles,
  outdir: outDir,
  format: 'cjs',
  platform: 'node',
  sourcemap: false,
  target: 'esnext',
})

// Переименовываем `.js` файлы в `.cjs`
getAllFiles(outDir).forEach((file) => {
  if (extname(file) === '.js') {
    const newPath = join(dirname(file), `${basename(file, '.js')}.cjs`)
    renameSync(file, newPath)
  }
})

// Копируем `.json` файлы без изменений
allFiles.forEach((file) => {
  if (extname(file) === '.json') {
    const relativePath = file.replace(srcDir, '')
    const destPath = join(outDir, relativePath)
    ensureDirStructure(destPath)
    copyFileSync(file, destPath)
  }
})

// 🔥 Исправляем импорты в `index.cjs` и других файлах
getAllFiles(outDir).forEach((file) => {
  if (extname(file) === '.cjs') {
    let content = readFileSync(file, 'utf8')

    // Заменяем `.js` импорты на `.cjs`
    content = content.replace(/(require\(['"]\.\/.*?)(\.js)(['"]\))/g, '$1.cjs$3')
    content = content.replace(/(import .*? from ['"]\.\/.*?)(\.js)(['"])/g, '$1.cjs$3')

    writeFileSync(file, content)
  }
})

console.log('✅ Все файлы сконвертированы в `.cjs`, `.json` остались без изменений.')
console.log('✅ Импорты в `index.cjs` обновлены с `.js` → `.cjs`.')
