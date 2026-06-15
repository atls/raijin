

## [2.0.11](https://github.com/atls/raijin/compare/@atls/code-pack@2.0.10...@atls/code-pack@2.0.11) (2026-06-15)


### Bug Fixes


* **code-pack:** allow missing conditional pnp payloads ([a4ab161](https://github.com/atls/raijin/commit/a4ab16133f2af80dc453ae9cfe510627a0659d6a))
* **code-pack:** detect patched conditional payloads ([1e38088](https://github.com/atls/raijin/commit/1e38088c5faeb4c71daa906010c4f4acd82c4b7e))
* **code-pack:** devirtualize pnp unplugged locators ([fa6750c](https://github.com/atls/raijin/commit/fa6750ce97518ce0dc3e8fb090d4a5b0f0e63d94))
* **code-pack:** inspect split pnp data ([c9929bb](https://github.com/atls/raijin/commit/c9929bb68a96288909ebe58b68ffd6171809bdfb))
* **code-pack:** map image 386 platform to ia32 ([8a32461](https://github.com/atls/raijin/commit/8a324610ddddd05c38c8f6c03368960519cdd56c))
* **code-pack:** match conditional unplugged locators exactly ([ab233c6](https://github.com/atls/raijin/commit/ab233c67f914e6615645d93971a8782980b0a8ca))
* **code-pack:** normalize endian platform cpu aliases ([9c1cd6a](https://github.com/atls/raijin/commit/9c1cd6afc8b15cd3b72f01da828b698fdf9eadae))
* **code-pack:** normalize windows image platform ([85d35f0](https://github.com/atls/raijin/commit/85d35f09fa7ee4bb318cff2f57d5c753ff3328ad))
* **code-pack:** parse compound yarn platform conditions ([49f9080](https://github.com/atls/raijin/commit/49f9080e63aa0fb223342b11704474b0d69aaa48))
* **code-pack:** preserve pnp unplugged payload ([f79a6af](https://github.com/atls/raijin/commit/f79a6afcfc2ecf18bc6d3e968ce90fe87c4e02f6))
* **code-pack:** preserve requested platform cpu ([a7eaaad](https://github.com/atls/raijin/commit/a7eaaad71dd4e8776233376a866d7be27c150c13))
* **code-pack:** reject unplugged payloads outside context ([1b0a75c](https://github.com/atls/raijin/commit/1b0a75cc5314a66fe12ff74f4e107580e974d55a))
* **code-pack:** respect target libc conditions ([37f144a](https://github.com/atls/raijin/commit/37f144a05cbe1972d655b43718b78d0f9702050e))
* **code-pack:** validate custom pnp unplugged folder ([30efd64](https://github.com/atls/raijin/commit/30efd648a21c0f9bdb28e398e6a7c6cb81c0ed2c))
* **code-pack:** validate target conditional payloads ([7fb496f](https://github.com/atls/raijin/commit/7fb496ff98c0ea2a6627a7ce140c8771fcfa1e2b))





## [2.0.10](https://github.com/atls/raijin/compare/@atls/code-pack@2.0.9...@atls/code-pack@2.0.10) (2026-06-11)


### Bug Fixes


* **code-pack:** propagate pack command failures ([10ece28](https://github.com/atls/raijin/commit/10ece285e961f3e0e82b6439373a580646468538))





## [2.0.9](https://github.com/atls/raijin/compare/@atls/code-pack@2.0.8...@atls/code-pack@2.0.9) (2026-05-14)






## [2.0.8](https://github.com/atls/raijin/compare/@atls/code-pack@2.0.7...@atls/code-pack@2.0.8) (2026-04-29)






## [2.0.7](https://github.com/atls/raijin/compare/@atls/code-pack@2.0.6...@atls/code-pack@2.0.7) (2025-12-07)


### Bug Fixes


* **raijin:** linter ([790b4d8](https://github.com/atls/raijin/commit/790b4d8943b1352521fc782143999bb74d8b152c))



## [2.0.6](https://github.com/atls/raijin/compare/@atls/code-pack@2.0.5...@atls/code-pack@2.0.6) (2025-03-09)

### Features

- **common:** bump ([#494](https://github.com/atls/raijin/issues/494)) ([381d535](https://github.com/atls/raijin/commit/381d5357c2818e157330933edb9256936d251ca3))

## 2.0.5 (2025-01-30)

### Bug Fixes

- buildpack switched to monstrs temporarily ([9135aef](https://github.com/atls/raijin/commit/9135aef985951200b3b37df24cbf13a810a183f9))
- **common:** yarn check ([#485](https://github.com/atls/raijin/issues/485)) ([b0c3cfa](https://github.com/atls/raijin/commit/b0c3cfad8f559c55691ca733c7a3a7b3cd00c4d8))
- fallback for buildpack base builder version ([5bddc4f](https://github.com/atls/raijin/commit/5bddc4ff008ba157d52defc1d8577d5609e14a97))
- **pack:** install pack ([c178323](https://github.com/atls/raijin/commit/c17832351522748181b1c9dfc608d467473cc6cf))
- typecheck ([27ccb0e](https://github.com/atls/raijin/commit/27ccb0ef63898afd00b830952914e060b8dd5593))

### Features

- add flag --trust-builder to pack commands ([b820e04](https://github.com/atls/raijin/commit/b820e04ba038cae344d754645e4b0351efe01a17))
- add flag "trust builder" ([51c6167](https://github.com/atls/raijin/commit/51c6167311174652c110628629ac9bf29e9f33a5))
- BREAKING CHANGE - bump yarn bundle to 4.1.1 ([b3db628](https://github.com/atls/raijin/commit/b3db62837ed75cbbedaf3c13678ab58398bfe50f))
- bump yarn packages ([6916cb0](https://github.com/atls/raijin/commit/6916cb01c753afd6abd939d193959be6ef0a4b1e))
- code pack ([4f684d4](https://github.com/atls/raijin/commit/4f684d4a289b02bf9e4f31eaa137dd8789f24d8e))
- code to ecma modules, bump types/node ([e8dbbfd](https://github.com/atls/raijin/commit/e8dbbfd6891ef59fbd40cb978792f5f6b2642f11))
- **code:** preparing esm migration ([85d6702](https://github.com/atls/raijin/commit/85d6702f217df0e0e6e978a98599d1cb1a61f87c))
- **code:** schematics init ([dad2bc3](https://github.com/atls/raijin/commit/dad2bc308b07ed6275c3a74e21965d521ae07cf3))
- **common:** bump to minor ([775c630](https://github.com/atls/raijin/commit/775c630061f91970a65e34afabeea8d029e02176))
- init code-runtime, WIP for yrnpkg 3v downgrading ([587d7dc](https://github.com/atls/raijin/commit/587d7dc75c6b08c2a4b0a0b4bf380939de83a6c3))
- **pack:** support buildpacks extensions, install pack if missing ([#465](https://github.com/atls/raijin/issues/465)) ([9f98935](https://github.com/atls/raijin/commit/9f98935c46ed6d507ad962aaa39027103ae10c77))
- remove @atls/builder, init cli-ui-schematics ([9a89280](https://github.com/atls/raijin/commit/9a892802fc3571f5ca46da67dcd10dcdc016e476))
- remove js files, upgrade all bundles ([46ecbec](https://github.com/atls/raijin/commit/46ecbec27339babc3c0c894b29c544e6c554e7b2))
- remove repository field, add cli & webpack utilities ([f47613e](https://github.com/atls/raijin/commit/f47613e9784e9eea86ed98e712198b000ca5766d))
- resolve conflicts ([537749d](https://github.com/atls/raijin/commit/537749d68ead3ef942d325787de4ab77e7b2bfa4))
- stabilize deps ([3a0bd65](https://github.com/atls/raijin/commit/3a0bd65071d207c2cb22cfe05b664d37d5f7a4c9))
- update common deps ([b5098e8](https://github.com/atls/raijin/commit/b5098e843c0153a476c16ae8607ba2b598accb60))
- update deps ([0de0475](https://github.com/atls/raijin/commit/0de04751e64fc9e6d72879289b773f1fa1ec3526))
- update deps ([de29dbf](https://github.com/atls/raijin/commit/de29dbffcc0c1b9cf081825987e733352b1761a7))
- update eslint config ([626741f](https://github.com/atls/raijin/commit/626741f1896c709c83857818333dc15f28787036))
- upgrade ([17fd794](https://github.com/atls/raijin/commit/17fd794be8d7b17693fdb8ae50e6ec83891632d8))
- upgrade node to 18 ([63ff5ca](https://github.com/atls/raijin/commit/63ff5ca56a526a174e82ebdc215f44e55db7a4f0))
- yarn bump ([7948fe2](https://github.com/atls/raijin/commit/7948fe20493323c9af0f0b55cddd92d4cf9553bf))
- **yarn:** essentials, renderer, tools, types, ui ([e683746](https://github.com/atls/raijin/commit/e683746e203e1d8486c1f4d92d9d9d8f785f84ee))
- **yarn:** workspace utils ([ffc200d](https://github.com/atls/raijin/commit/ffc200d0f0cf6444fe9053a7f046a5d039f79177))

### Performance Improvements

- switching to atls registry ([039cd32](https://github.com/atls/raijin/commit/039cd32a8026c126c5fffc71bc4ac1f66e0d6f1f))

### Reverts

- Revert "feat: add flag "trust builder"" ([1b81fdd](https://github.com/atls/raijin/commit/1b81fdd5acfd0128ae737ecc98e336b59a24f0ee))
- Revert "fix: fallback for buildpack base builder version" ([7d0fd35](https://github.com/atls/raijin/commit/7d0fd35a5655654a3c1af05d7d0b230ccd135591))
