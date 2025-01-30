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
