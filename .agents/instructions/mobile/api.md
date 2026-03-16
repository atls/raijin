# API / Backend integration

## Где лежит

- Сегмент `api/` соответствующего слоя/слайса
- Для нового кода использовать слои `Features`, `Entities`, `Shared`

## Нейминг

- Контракт: `SomeApiContract` (interface)
- Реализация: `SomeApi` (class)

## Mappers

- Мапперы интеграции: `api/mappers`

## DI

- API client получать через DI

## GraphQL

- Использовать Apollo plugin только в проектах на GraphQL
- Использовать generated types, не дублировать вручную DTO/модели из schema

## Errors

- Ошибки транспорта/бэкенда маппить в типизированные ошибки на уровне `api/`
- Методы api должны отдавать `Result<T>`, возвращать просто `T` нельзя

## Related

- [DI](./di.md)
- [FSD rules](./fsd_rules.md)
- [Errors](./errors.md)
