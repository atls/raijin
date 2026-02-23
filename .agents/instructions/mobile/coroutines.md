# Coroutines
- Не блокировать main thread
- Не использовать `GlobalScope`
- IO/сеть запускать не на Main
- Scope должен быть управляемым (отменяемым)
- Использовать structured concurrency (`coroutineScope`, `supervisorScope`)

## Related

- [State / Store](./state_store.md)
- [Coordination](./coordination.md)
