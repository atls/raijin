# State / Store

## Где можно store

- `Widgets` и `Features`
- `Screens` - только с веской причиной (координация/сборка), иначе выносить ниже
- `Fragments` - легаси, новые store в `Fragments` не добавлять

## Что делает store

- Store хранит state и обновляет его
- Store не ходит в сеть, не делает сайд-эффекты, не содержит сложной логики

## Где живут действия

- Любые действия (API/IO/ошибки/успех) - в `lib/`
- Store дергается из `lib/` (или handle/handler), и только обновляет state

## Related

- [FSD rules](./fsd_rules.md)
- [Errors](./errors.md)
- [Coroutines](./coroutines.md)
