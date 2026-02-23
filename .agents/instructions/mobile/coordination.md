# Coordination (event bus)

## Когда можно
- Только если на ивент должно отреагировать несколько модулей/фич
- Пример: добавили взвешивание -> обновить профиль + дневник

## Где лежит
- Глобальная координация: `shared/model/coordination`
- Локальная координация внутри модуля: `<module>/shared/model/coordination`

## API
- Наружу: `SharedFlow` (read-only)
- Внутрь: setter/emit API

## Rules
- Не создавать coordination без кейса синка нескольких фич
- События должны быть предметными (`ProfileUpdated`), а не техническими (`SomethingChanged`)
- События не должны переносить тяжёлые payload-объекты без необходимости

## Related

- [Gradle modules](./gradle_modules.md)
- [FSD rules](./fsd_rules.md)
- [Coroutines](./coroutines.md)
