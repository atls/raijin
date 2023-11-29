# @atls/config-eslint

Наш собственный конфиг для `eslint`

## Инструкция по применению

1. Установить в корень проекта зависимость
   - `@atls/config-eslint`
   - `@rushstack/eslint-patch`, рабочая версия 1.6.0 (необходим чтобы `eslint` брал плагины и
     парсеры из пакета с нашей зависимостью, а не требовал ее установку в каждом проекте)
2. (пока мы на 8 версии `eslint`) необходимо сделать анплаг конфига: `yarn unplug @atls/config-eslint`
3. В корне проекта создать `.eslintrc.js`
4. Вставить в него:

```js
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  // прописать путь до нашего пакета.
  // В светлом будущем можно будет так: '@atls/config-eslint'
  // А пока через анплаг, то будет что то вроде
  // './.yarn/unplugged/@atls-config-eslint-npm-0.0.9-eb6c230fca/node_modules/@atls/config-eslint/dist/.eslintrc.js'
  extends: ['./config/eslint/dist/eslintrc.js'],
  parserOptions: {
    // Ссылка на рутовый tsconfig.
    // eslint смотрит на inlude и проверяет только  эти файлы.
    project: './tsconfig.json',
  },
  // Это чтобы eslint не проверял ваш конфиг.
  // Можно добавить и другие файлы по необходимости.
  ignorePatterns: ['.eslintrc.js'],
}
```

5. Добавить настройки для вашей IDE:

- Настройки - ESLint:
- Manual ESLint Configuration - выбрать
- ESLint package - дать ссылку до рута (`yarn:package.json:eslint`)
- Configuration File - дать ссылку до вашего созданного `.eslintrc.js` в руте
  (`/Users/*/*/*/atlantis/tools/.eslintrc.js`)

6. Проверить `include` в рутовом `tsconfig.json` чтобы содержал все папки с рабочими файлами

## Рекомендация для IDE

Плагин для JetBrains IDE `Inspection Lens` - пишет ошибки рядом с кодом без необходимости
наведению мышью или F2.

## Для будущих соискателей приключений

В `src/working-example` лежат рабочие на момент написания конфиги. К сожалению они не
компилируются из `index.ts`, поэтому приходится держать дубликат `eslint.ts` в котором уже
сделано как надо.
