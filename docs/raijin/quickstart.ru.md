# Raijin Quickstart

Минимальный bootstrap для стабильной работы с кастомным Yarn-бандлом `atls`

<!-- sync:preflight -->
## 1. Preflight

- Node.js: `22.x`
- Внутри `raijin` перед `yarn`-командами выполняйте `source .env` и `export NODE_OPTIONS`

<!-- sync:bundle-install -->
## 2. Установка бандла в проект-потребитель

- `yarn set version https://raw.githubusercontent.com/atls/raijin/master/yarn/cli/dist/yarn.mjs`

<!-- sync:bundle-upgrade -->
## 3. Обновление установленного бандла

- `yarn set version atls`

<!-- sync:verification -->
## 4. Базовая проверка

- `yarn check`
- `yarn files changed list`
- `yarn test unit`

