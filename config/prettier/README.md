# @atls/config-prettier

Наш кастомный конфиг `Prettier` с плагином для сортировки импортов (пока не умеет выравнивать 
`from` между группам импортов).

## Инструкция по применению (проверено на IDE JetBrains от 2023.2.5)

1. Установить в корне проекта
 - `@atls/config-prettier`
 - `prettier` (протестировано на 3.1.0)
2. Анплаг конфига `yarn unplug @atls/config-prettier`
3. В корневом `package.json` прописать
```json
  ...
  "license": "BSD-3-Clause"
  "prettier": "@atls/config-prettier",
  ...
```

Для IDE от JetBrains можно выставить форматирование при сохранение либо по комбинации
- **macOS**: Cmd + Option + L
- **Linux/Windows**: Ctrl + Alt + L

## Внимание

**IDE Jetbrains** более ранних версий не умеют работать с конфигом prettier из Yarn PnP. 
Протестировано на 2022.2.5. `prettier` не увидит правил нашего конфига и будет форматировать по 
умолчанию (напр. `""` вместо наших `''`)
