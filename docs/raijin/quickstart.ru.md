# Raijin Quickstart

Минимальный сценарий подключения и проверки кастомного Yarn-бандла `atls`

<!-- sync:preflight -->

## 1. Предпосылки

- Node.js: `>= 24` (не ниже `24`)
- Yarn: `>= 4` (не ниже `4`)
- Рабочий проект с `package.json`

Ожидаемый результат:

- Команда `yarn --version` выполняется, и проект готов к переключению версии Yarn

<!-- sync:new-project -->

## 2. Новый проект: подключение бандла

```bash
yarn set version https://raw.githubusercontent.com/atls/raijin/master/yarn/cli/dist/yarn.mjs
yarn set version atls
```

Ожидаемый результат:

- В `.yarn/releases/` появляется актуальный `yarn.mjs` из Raijin
- Команды из бандла (`check`, `files changed list` и другие) становятся доступны

<!-- sync:bundle-upgrade -->

## 3. Обновление установленного бандла

```bash
yarn set version atls
```

Ожидаемый результат:

- Бандл обновлён до последней доступной версии

<!-- sync:verification -->

## 4. Базовая проверка

```bash
yarn check
yarn files changed list
```

Ожидаемый результат:

- `yarn check` завершает полный проход проверок без ошибок маршрутизации
- `yarn files changed list` возвращает список файлов или пустой список, если изменений нет

<!-- sync:consumer-howto -->

## 5. Как использовать в чужом проекте

- Подключите бандл один раз, затем поддерживайте версию через `yarn set version atls`
- Коммитьте изменения `.yarn/releases` и `.yarnrc.yml` вместе с обновлением бандла
- Для CI используйте те же команды, что и локально, чтобы избежать расхождения поведения
