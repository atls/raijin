export class ExitHandler {
  static ErrorStatusCode = 1

  static FailStatusCode = 100

  static PassStatusCode = 0

  static pass() {
    process.exit(ExitHandler.PassStatusCode)
  }

  static fail() {
    process.exit(ExitHandler.FailStatusCode)
  }

  static error(error) {
    console.error(error) // eslint-disable-line

    process.exit(ExitHandler.ErrorStatusCode)
  }
}
