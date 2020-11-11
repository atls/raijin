# Generator

## install

```sh
yarn add @atlantis-lab/actl-generator
```

## Usage
#
### Basic
```typescript
import { Generator, GeneratorOptionsBuilder } from '@atlantis-lab/actl-generator'

interface User {
  readonly firstName: string
  readonly lastName: string
}

const userResolver = async (): Promise<User> => ({ firstName: 'Mark', lastName: 'Shuttleworth' })

const options = new GeneratorOptionsBuilder<User>()
  .pick('firstName')
  .pick('lastName')
  .setDefaultResolver(userResolver)
  .getOptions()

const generator = new Generator<User>(options)

generator.generate().then(console.log) // { firstName: 'Mark', lastName: 'Shuttleworth' }
```
#
### Compose
```typescript
import { Generator, GeneratorOptionsBuilder } from '@atlantis-lab/actl-generator'

interface User {
  readonly firstName: string
  readonly lastName: string
}

const userResolver = async (): Promise<User> => ({ firstName: 'Mark', lastName: 'Shuttleworth' })
const bestUserResolver = async (): Promise<User> => ({ firstName: 'Linus', lastName: 'Torvalds' })
const bestOfTheBestLastNameResolver = () => 'Genius'

const options = new GeneratorOptionsBuilder<User>()
  .pick('firstName')
  .pick('lastName')
  .setDefaultResolver(userResolver)
  .setHandler('firstName', bestUserResolver)
  .setHandler('lastName', bestUserResolver)
  .setHandler('lastName', bestOfTheBestLastNameResolver)
  .getOptions()

const generator = new Generator<User>(options)

generator.generate().then(console.log) // { firstName: 'Linus', lastName: 'Genius' }
```