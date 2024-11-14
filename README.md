![toolset-github-cover](https://user-images.githubusercontent.com/102182195/234980835-78ed0fdb-c692-4b0e-ac95-b46c8cbd17a4.png)

# Atlantis Toolset

[//]: # 'VERSIONS'

[<img src="https://img.shields.io/static/v1?style=for-the-badge&label=%40atls%2Fcode-service&message=1.0.0&labelColor=ECEEF5&color=D7DCEB" alt='badge'>](https://npmjs.com/package/@atls/code-service) [<img src="https://img.shields.io/static/v1?style=for-the-badge&label=%40atls%2Fschematics&message=1.0.0&labelColor=ECEEF5&color=D7DCEB" alt='badge'>](https://npmjs.com/package/@atls/schematics)

Monorepo with a set of tools and utilities, developed by our team, to ease our day-to-day work on projects.

Tools are designed to be used in projects with Javascript and Typescript and are designed to increase developer performance as well as unify development experience.

## Start

**IMPORTANT:** we use our [custom yarn bundle](https://yarnpkg.com/builder/cli/build/bundle)

To start using it:

- `yarn set version https://raw.githubusercontent.com/atls/raijin/master/yarn/cli/dist/yarn.mjs` - installs our latest custom yarn bundle in the project scope.

## Commonly used scrips `yarn`

Besides standard `yarn` scripts we developed our custom ones for ease of work:

### General

- `yarn check` - executes `typecheck`, `lint`, `format`. Executes automatically on commits via `husky`. <span style="font-weight: bold">Execute before createing Pull Request</span>
- `yarn files changed list` - print out list of changed files
- `yarn commit ...` - work with git commits
  - `message` - create commit message
  - `staged` - move commit to stage

### Checks

- `yarn typecheck` - executes type check
- `yarn lint` - executes ESLint

### Code formatting

- `yarn format` - reformats whole project based on our `prettier` config

### Generation

- `yarn generate project` - generate project schematics
- `yarn badges generate` - generates badges in root **README.md** based on version in root **package.json**

### Build

- `yarn service build` - build as service bundle
- `yarn service dev` - run service in dev mode
- `yarn library build` - build as library
- `yarn image pack` - build as docker image via buildpacks

### Testing

- `yarn test ...` - run tests
  - `integration` - integration tests. Runs tests in `integration` folders
  - `unit` - runs all tests besides ones in `integration` folders
    - `name of file/test suite` - runs only tests matching pattern

Options:

- `--watch` - run tests and rerun upon changes in linked files
- `--watchAll` - run tests in **any** changes in repo

### Check project for build errors

- `yarn workspaces changed foreach image pack --publish --tag-policy hash-timestamp --registry some` - build services with local changes
- `yarn workspaces foreach image pack --publish --tag-policy hash-timestamp --registry some` - build all services

## Our configs

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://github.com/atls/tools/blob/557cd9458c527b060e02316bc35469e208a800f2/config/typescript/src/index.ts)
[![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white)](https://github.com/atls/tools/blob/557cd9458c527b060e02316bc35469e208a800f2/config/eslint/src/index.ts)
[![Prettier](https://img.shields.io/badge/prettier-1A2C34?style=for-the-badge&logo=prettier&logoColor=F7BA3E)](https://github.com/atls/tools/blob/557cd9458c527b060e02316bc35469e208a800f2/config/prettier/src/index.ts)
[![Webpack](https://img.shields.io/badge/webpack-%238DD6F9.svg?style=for-the-badge&logo=webpack&logoColor=black)](https://github.com/atls/tools/blob/8537e2f78ca5a2bd925548efce21a2d5c4800543/code/code-service/src/webpack.config.ts)
