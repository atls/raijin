# Документация Raijin

Здесь — быстрый старт и карта команд. Если только подключаете Raijin, начните с быстрого старта.

## Языки

- [Русский](./README.ru.md)
- [English](./README.md)

## Что читать

- Подключение, хуки и CI: [быстрый старт](./raijin/quickstart.ru.md)
- Все доступные команды: [карта команд](./raijin/README.ru.md)
- Когда нужна полная проверка, хук или проверка PR: [корневой README](../README.md)

## Для сопровождающих

Сценарии GitHub Actions самого Raijin доставляются Terraform из [atls/infrastructure](https://github.com/atls/infrastructure). Меняйте исходники там, а не доставленные файлы в `.github/workflows`. Проекты-потребители владеют своими сценариями CI.
