# Navigation

## База

- Навигация задаётся на уровне конкретного проекта
- Этот файл = каркас + минимальные общие правила

## Общие правила

- Routes должны быть type-safe (args типизированы)
- Root graph в `app` entrypoint
- Каждый `features/*` модуль должен иметь собственный nav-graph
- Саб-графы из `features/` подключаются в `app` entrypoint

## Related

- [Gradle modules](./gradle_modules.md)
- [FSD rules](./fsd_rules.md)
- [DI](./di.md)
