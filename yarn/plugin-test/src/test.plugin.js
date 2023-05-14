import { TestIntegrationCommand } from './test-integration.command';
import { TestUnitCommand } from './test-unit.command';
export const plugin = {
    commands: [TestIntegrationCommand, TestUnitCommand],
};
