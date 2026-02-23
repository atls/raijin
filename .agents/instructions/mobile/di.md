# DI

## База

- DI контейнер: Koin
- Каждый Gradle модуль, в котором есть внешние зависимости, обязан объявить свой Koin module

## Где стартует Koin
- `startKoin { ... }` запускается в application module (entry point приложения)
- В application module подключаются DI-модули всех фич

## DI модули
- Любой Gradle модуль с DI-зависимостями создает `val <name>Module: Module`
- Application module импортит DI-модули нужных Gradle-модулей и подключает в `startKoin { modules(...) }`
- Именование `<name>Module` должно отражать домен модуля (`profileModule`, `authModule`)
