import { BaseCommand }        from '@yarnpkg/cli'

import { TEST_PRODUCER_PATH } from './producer.js'
import { runTestProducer }    from './producer.js'

export class ProducerCommand extends BaseCommand {
  static override paths = [[...TEST_PRODUCER_PATH]]

  override async execute(): Promise<number> {
    return runTestProducer()
  }
}
