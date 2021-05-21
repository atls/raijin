import { Command } from 'clipanion'

class ServiceStartCommand extends Command {
  @Command.Path(`service`, `start`)
  async execute() {
    this.context.stdout.write(`Deprecated, use 'actl service dev'.`)

    await this.cli.run(['service', 'dev'])
  }
}

export { ServiceStartCommand }
