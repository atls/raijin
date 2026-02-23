# Gradle modules

## База

- Gradle multi-module
- Gradle 8+ (AGP по проекту)
- Kotlin DSL: `*.gradle.kts`
- Повторяемую конфигурацию выносить в convention plugins (compile options, compose, lint, publishing и т.п.)

## Группы модулей

- `:app`
- `:shared`
- `:ui`
- `:features:*`

## Роли

### :app

- Точка сборки: DI, root navigation, глобальные провайдеры
- Содержит только wiring

### :shared
- Общие типы, utils, errors, infra
- Если нужна отдельная либа/подсистема, которая переиспользуется в нескольких фичах в одном и том же контексте, выносим её в `:shared:<name>` (например `:shared:weight`). В корневой `:shared` не сваливаем.

### :ui
- UI-kit и дизайн-система: tokens/theme/components

### :features:<name>
- Один модуль = одна зона ответственности
- Отдельный feature-пакет: модуль должен подключаться независимо от остальных фич
- Самодостаточность обязательна: внутри есть
  - своя навигация (feature-level graph/роутинг)
  - свой UI слой (экраны/виджеты/контейнеры) и UI-state
  - свои DI-модули (wiring внутри фичи)
  - свой minimal public API для подключения из `:app`
- Внутри модуля соблюдать [FSD rules](./fsd_rules.md)

## Общие constraints по зависимостям
- Циклические зависимости запрещены
- Горизонтальные зависимости между `:features:*` запрещены (feature-to-feature)
- `:app` может зависеть от любых модулей
- Рекомендуемый граф:
  - `:features:*` -> `:shared` + `:ui`
  - `:ui` -> `:shared`
  - `:shared` не зависит от `:features:*` и `:app`

Связь фич между собой делать через:
- контракты/абстракции в `:shared`
- публичный API фичи только для кросс-фичевого контракта, который нельзя выразить через `:shared`

## Добавление нового feature-модуля
- Путь: `features/<name>`
- Gradle path: `:features:<name>`
- Подключение: в `settings.gradle.kts` (или в `gradleSettings/modules.gradle.kts`, если этот файл уже используется в проекте)
- Требования:
  - чёткая зона ответственности
  - [FSD rules](./fsd_rules.md) внутри
  - переиспользовать `:ui` и `:shared`

## Convention plugins
- Использовать для повторяемой конфигурации
