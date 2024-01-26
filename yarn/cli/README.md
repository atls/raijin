# Atls Yarn Bundle

Здесь в `/bundles` хранятся наши кастомные бандлы `Yarn`.

- `/bundles/yarn.js` - самый актуальный бандл собранный по максимально возможным версиям. Под
  капотом - `Yarn 4.0.2`
- `/bundles/legacy/yarn.js` - наш легаси бандл

## Ограничения по используемым версиям

| **Пакет/среда** | **4.0.2**  | **Легаси** |
| --------------- | ---------- | :--------: |
| **Typescript**  | == 5.2.2   | \<= 4.6.4  |
| **ESLint**      | \>= 8.50.0 | \<= 8.20.0 |
| **Prettier**    | \>= 3.1.1  | \<= 3.0.0  |
| **NodeJS**      | \>= 18.13  | \<= 18.13  |

## Последние рабочие версии наших пакетов для работы с легаси бандлом

|                    Пакет                     | Версия |
| :------------------------------------------: | ------ |
|              @atls/code-service              | 0.0.24 |
|             @atls/config-eslint              | 0.0.11 |
|              @atls/config-jest               | 0.0.9  |
|            @atls/config-prettier             | 0.0.7  |
|           @atls/config-typescript            | 0.0.3  |
|      @atls/cli-ui-error-info-component       | 0.0.5  |
|     @atls/cli-ui-eslint-result-component     | 0.0.5  |
|      @atls/cli-ui-git-commit-component       | 0.0.8  |
|      @atls/cli-ui-log-record-component       | 0.0.8  |
|              @atls/cli-ui-parts              | 0.0.5  |
|           @atls/cli-ui-pretty-logs           | 0.0.8  |
|            @atls/cli-ui-renderer             | 0.0.7  |
|      @atls/cli-ui-schematics-component       | 0.0.20 |
|              @atls/cli-ui-parts              | 0.0.5  |
|        @atls/cli-ui-source-component         | 0.0.7  |
|      @atls/cli-ui-stack-trace-component      | 0.0.7  |
| @atls/cli-ui-typescript-diagnostic-component | 0.0.18 |
|              @atls/code-commit               | 0.0.7  |
|           @atls/code-configuration           | 0.0.10 |
|              @atls/code-format               | 0.0.23 |
|           @atls/code-format-worker           | 0.0.18 |
|               @atls/code-lint                | 0.0.28 |
|            @atls/code-lint-worker            | 0.0.21 |
|               @atls/code-pack                | 0.0.18 |
|            @atls/code-schematics             | 0.0.18 |
|         @atls/code-schematics-worker         | 0.0.18 |
|              @atls/code-service              | 0.0.24 |
|          @atls/code-service-worker           | 0.0.18 |
|               @atls/code-test                | 0.0.23 |
|            @atls/code-test-worker            | 0.0.19 |
|            @atls/code-typescript             | 0.0.22 |
|         @atls/code-typescript-worker         | 0.0.18 |
|           @atls/code-worker-utils            | 0.0.6  |
|            @atls/prettier-plugin             | 0.0.7  |
|               @atls/schematics               | 0.0.19 |
|            @atls/schematics-utils            | 0.0.8  |
|       @atls/webpack-localtunnel-plugin       | 0.0.6  |
|      @atls/webpack-proto-imports-loader      | 0.0.11 |
|      @atls/webpack-start-server-plugin       | 0.0.6  |
