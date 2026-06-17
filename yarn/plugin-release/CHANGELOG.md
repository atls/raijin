

## [1.1.3](https://github.com/atls/raijin/compare/@atls/yarn-plugin-release@1.1.2...@atls/yarn-plugin-release@1.1.3) (2026-06-17)


### Bug Fixes


* **yarn-plugin-library:** move private pack metadata from publishConfig ([1b13f19](https://github.com/atls/raijin/commit/1b13f19aa0f46c9526db6963319c8f1031c298a7))





## [1.1.2](https://github.com/atls/raijin/compare/@atls/yarn-plugin-release@1.1.1...@atls/yarn-plugin-release@1.1.2) (2026-06-17)


### Bug Fixes


* **yarn-plugin-release:** bump release plan schema ([7d93188](https://github.com/atls/raijin/commit/7d931889b8bce2b17bba4d618557022cdbc8983c))
* **yarn-plugin-release:** drop release ownership metadata ([ed0c760](https://github.com/atls/raijin/commit/ed0c76097010ba3c67bb1acf1ce44108920d246e))
* **yarn-plugin-release:** enforce release ownership contract ([8ee7089](https://github.com/atls/raijin/commit/8ee7089795e29b571cd949becb6fbca791884e4e))





## [1.1.1](https://github.com/atls/raijin/compare/@atls/yarn-plugin-release@1.1.0...@atls/yarn-plugin-release@1.1.1) (2026-06-15)


### Bug Fixes


* **yarn-plugin-release:** include declined release plan targets ([923085f](https://github.com/atls/raijin/commit/923085fd8260d717657f7fcafdb9a5dedc9bce3a))
* **yarn-plugin-release:** preserve deferred version decisions ([394772f](https://github.com/atls/raijin/commit/394772f2106bac3a9485289d459307a16780721b))
* **yarn-plugin-release:** use yarn deferred targets for release plans ([05d8417](https://github.com/atls/raijin/commit/05d84171447a88f79454156b868aa8090aa2abfa))





# [1.1.0](https://github.com/atls/raijin/compare/@atls/yarn-plugin-release@1.0.10...@atls/yarn-plugin-release@1.1.0) (2026-06-15)


### Bug Fixes


* **yarn-plugin-release:** honor deferred target versions ([caa4913](https://github.com/atls/raijin/commit/caa491378aebe76310c8ab7302b5f765d153ed73))
* **yarn-plugin-release:** reject unsupported plan decisions ([c504960](https://github.com/atls/raijin/commit/c5049604aff0376b912c26cc4703cd04055b2b6b))
* **yarn-plugin-release:** resolve plan workspaces by absolute cwd ([ddaeed6](https://github.com/atls/raijin/commit/ddaeed6fe38b773a863cae06390c7d8b53b1a6ec))
* **yarn-plugin-release:** skip declined release plan workspaces ([d699eea](https://github.com/atls/raijin/commit/d699eeafe5144d27f8369d220caaadb93cd71c82))
* **yarn-plugin-release:** use yarn version strategy resolution ([6aa32b0](https://github.com/atls/raijin/commit/6aa32b076507158c92329f26054ed9db199c2951))
* **yarn-plugin-release:** write target versions to release plan ([b0b73f5](https://github.com/atls/raijin/commit/b0b73f502e177d713b1f466a1a17cb2f57cbb2d4))

### Features


* **yarn-plugin-release:** add release plan contract ([6db30c3](https://github.com/atls/raijin/commit/6db30c34fd55537eaafa6cffdb0e64457197b3c0))





## [1.0.10](https://github.com/atls/raijin/compare/@atls/yarn-plugin-release@1.0.9...@atls/yarn-plugin-release@1.0.10) (2026-06-12)


### Bug Fixes


* **yarn-plugin-release:** include private release workspaces ([cd65639](https://github.com/atls/raijin/commit/cd656394d902c10bece510e1bbcf1029d450537e))
* **yarn-plugin-release:** tolerate existing release tags ([7995971](https://github.com/atls/raijin/commit/79959715dc93e8c6e5e0d6eaf8abb036dd3da6a4))





## [1.0.9](https://github.com/atls/raijin/compare/@atls/yarn-plugin-release@1.0.9...@atls/yarn-plugin-release@1.0.9) (2026-06-11)


### Bug Fixes


* **yarn-plugin-release:** tolerate existing release tags ([7995971](https://github.com/atls/raijin/commit/79959715dc93e8c6e5e0d6eaf8abb036dd3da6a4))





## [1.0.9](https://github.com/atls/raijin/compare/@atls/yarn-plugin-release@1.0.8...@atls/yarn-plugin-release@1.0.9) (2026-06-09)


### Bug Fixes


* **yarn-plugin-release:** exclude nested workspace owners ([1fea605](https://github.com/atls/raijin/commit/1fea6054ef8c73878ffdb51adecf24de28b8abd5))
* **yarn-plugin-release:** exclude private child root changes ([86751d4](https://github.com/atls/raijin/commit/86751d419147a9aad356541b5dfa94c0a4dec93a))
* **yarn-plugin-release:** honor explicit release range in ci ([1c6b327](https://github.com/atls/raijin/commit/1c6b32728668592254b57021691dfd87f5c9a22f))
* **yarn-plugin-release:** include merge commit files locally ([511eb30](https://github.com/atls/raijin/commit/511eb308e8ba9213a0046244d7c5346345f7c848))
* **yarn-plugin-release:** include renamed github files ([dd940aa](https://github.com/atls/raijin/commit/dd940aae9bed90116457226b7e24eb0492779aa6))
* **yarn-plugin-release:** include root workspace release changes ([8d80996](https://github.com/atls/raijin/commit/8d809960e62bd9717d6a0392b2f4c3c7abbf9311))
* **yarn-plugin-release:** keep multiline breaking footers ([a0bfc02](https://github.com/atls/raijin/commit/a0bfc02d7a3550e086f73f486e27d86049ac53d0))
* **yarn-plugin-release:** parse breaking footer trailers ([7d4dd9d](https://github.com/atls/raijin/commit/7d4dd9d563392a6c5a5c6495f6e185e241d5cd72))
* **yarn-plugin-release:** preserve declined deferred decisions ([eca2265](https://github.com/atls/raijin/commit/eca2265e8d10ab8a7e1f5d72db70a7a6f020dc4b))
* **yarn-plugin-release:** preserve deferred release levels ([df18529](https://github.com/atls/raijin/commit/df18529d577643e4985bac6ef6e4717587cf30a6))
* **yarn-plugin-release:** preserve explicit deferred decisions ([92ffffd](https://github.com/atls/raijin/commit/92ffffdf91513af45284c9c6d000f976b9428595))
* **yarn-plugin-release:** select merge diff parent ([b236122](https://github.com/atls/raijin/commit/b236122ff764ca3fdb678c85825d35c01f0f2c95))
* **yarn-plugin-release:** use one-sided default release range ([51903ef](https://github.com/atls/raijin/commit/51903ef1890c76adeeca559a5cd7a7f78088614c))
* **yarn-plugin-release:** use remote default branch for release range ([eddc2d9](https://github.com/atls/raijin/commit/eddc2d902e4b75a7754dee5f099e90f6f8c1cb40))

### Features


* **yarn-plugin-release:** add conventional deferred version policy ([47b6f01](https://github.com/atls/raijin/commit/47b6f0186cbb177c325c37cdb4d79d83d79f77bd))





## [1.0.8](https://github.com/atls/raijin/compare/@atls/yarn-plugin-release@1.0.7...@atls/yarn-plugin-release@1.0.8) (2026-04-29)






## [1.0.7](https://github.com/atls/raijin/compare/@atls/yarn-plugin-release@1.0.6...@atls/yarn-plugin-release@1.0.7) (2025-12-07)


### Bug Fixes


* **raijin:** linter ([790b4d8](https://github.com/atls/raijin/commit/790b4d8943b1352521fc782143999bb74d8b152c))



## [1.0.6](https://github.com/atls/raijin/compare/@atls/yarn-plugin-release@1.0.6...@atls/yarn-plugin-release@1.0.6) (2025-03-09)

## [1.0.6](https://github.com/atls/raijin/compare/@atls/yarn-plugin-release@1.0.5...@atls/yarn-plugin-release@1.0.6) (2025-01-30)

### Bug Fixes

- **common:** yarn check ([#485](https://github.com/atls/raijin/issues/485)) ([b0c3cfa](https://github.com/atls/raijin/commit/b0c3cfad8f559c55691ca733c7a3a7b3cd00c4d8))

## [1.0.5](https://github.com/atls/raijin/compare/@atls/yarn-plugin-release@1.0.4...@atls/yarn-plugin-release@1.0.5) (2025-01-09)

## [1.0.5](https://github.com/atls/raijin/compare/@atls/yarn-plugin-release@1.0.4...@atls/yarn-plugin-release@1.0.5) (2025-01-09)

## <small>1.0.4 (2025-01-05)</small>

- chore: changelog ([6d5e66d](https://github.com/atls/raijin/commit/6d5e66d))
- chore(common): versions tools: @atls/code-test:2.0.13 @atls/yarn-cli:1.0.4 @atls/yarn-cli-tools: ([cab2f02](https://github.com/atls/raijin/commit/cab2f02))
- chore(common): versions tools: @atls/code-test:2.0.14 @atls/yarn-cli:1.0.5 @atls/yarn-cli-tools: ([7d46254](https://github.com/atls/raijin/commit/7d46254))
- chore(common): versions tools: @atls/yarn-cli:1.0.7 @atls/yarn-cli-tools:1.0.4 @atls/yarn-plugin ([c711a57](https://github.com/atls/raijin/commit/c711a57))
- fix(actions): commit patterns ([bc16a03](https://github.com/atls/raijin/commit/bc16a03))
- fix(actions): release ([b637af8](https://github.com/atls/raijin/commit/b637af8))
- fix(actions): release (#477) ([317bc35](https://github.com/atls/raijin/commit/317bc35)), closes [#477](https://github.com/atls/raijin/issues/477)
- fix(actions): release token ([e43c02d](https://github.com/atls/raijin/commit/e43c02d))
- fix(changelog): dependencies (#478) ([368ccbd](https://github.com/atls/raijin/commit/368ccbd)), closes [#478](https://github.com/atls/raijin/issues/478)
- fix(code-test): silence type error ([139219f](https://github.com/atls/raijin/commit/139219f))

## <small>1.0.3 (2025-01-01)</small>

- Merge pull request #474 from atls/fix/release ([934f93b](https://github.com/atls/raijin/commit/934f93b)), closes [#474](https://github.com/atls/raijin/issues/474)
