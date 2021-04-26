import { Generator, GeneratorOptionsBuilder } from '../src'

interface User {
  firstName: string
  lastName: string
}

describe('Generator', () => {
  const mock = () => ({ firstName: 'Gabe', lastName: 'Newell' })

  it('Use only defaultResolver', async () => {
    const generator = new Generator<User>(
      new GeneratorOptionsBuilder<User>()
        .setDefaultResolver(mock)
        .pick('firstName')
        .pick('lastName')
        .getOptions(),
    )

    const generationResult = await generator.generate()

    expect(generationResult).toEqual({ firstName: 'Gabe', lastName: 'Newell' })
  })

  it('Use defaultResolver & setHandler that returns literal', async () => {
    const fetchLastName = async () =>
      new Promise(resolve => setTimeout(() => resolve('Llewen'), 100))

    const generator = new Generator<User>(
      new GeneratorOptionsBuilder<User>()
        .setDefaultResolver(mock)
        .pick('firstName')
        .pick('lastName')
        .setHandler('lastName', fetchLastName)
        .getOptions(),
    )

    const generationResult = await generator.generate()

    expect(generationResult).toEqual({ firstName: 'Gabe', lastName: 'Llewen' })
  })

  it('GeneratorOptionsBuilder defaultResolver & setHandler returns object', async () => {
    const fetchUser = () =>
      new Promise(resolve =>
        setTimeout(
          () =>
            resolve({
              firstName: 'Mark',
              lastName: 'Shuttleworth',
            }),
          100,
        ),
      )

    const generator = new Generator<User>(
      new GeneratorOptionsBuilder<User>()
        .setDefaultResolver(mock)
        .pick('firstName')
        .pick('lastName')
        .setHandler('lastName', fetchUser)
        .setHandler('firstName', fetchUser)
        .getOptions(),
    )

    const generationResult = await generator.generate()

    expect(generationResult).toEqual({ firstName: 'Mark', lastName: 'Shuttleworth' })
  })
})
