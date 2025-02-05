import type { Rule }                     from '@angular-devkit/schematics'

import { MergeStrategy }                 from '@angular-devkit/schematics'
import { strings }                       from '@angular-devkit/core'
import { normalize }                     from '@angular-devkit/core'
import { apply }                         from '@angular-devkit/schematics'
import { url }                           from '@angular-devkit/schematics'
import { template }                      from '@angular-devkit/schematics'
import { move }                          from '@angular-devkit/schematics'
import { chain }                         from '@angular-devkit/schematics'
import { mergeWith }                     from '@angular-devkit/schematics'

import { updateTsConfigRule }            from '../rules/index.js'
import { generateCommonSource }          from '../sources/index.js'
import { generateProjectSpecificSource } from '../sources/index.js'

export const main = (options: any): Rule => {
  return chain([
    // updateTsConfigRule,
    // TODO эта функция добавляет в корень prettierrc & eslintrc. по всей видимости это уже не надо
    // этот скрипт должен добавлять все файлы из папки files/common - а это и gitignore и скрипты husky. в последнем запуске их не добавил
    // сейчас скрипт перемещает в dist только файлы в формате js & json
    // файлы-шаблоны для генерации не имеют расширения, но их тоже надо переместить
    mergeWith(generateCommonSource(options), MergeStrategy.Overwrite),
    // mergeWith(generateProjectSpecificSource(options), MergeStrategy.Overwrite),
  ])
}
