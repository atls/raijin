import { ServiceBuildCommand } from './service-build.command';
import { ServiceDevCommand } from './service-dev.command';
export const plugin = {
    commands: [ServiceBuildCommand, ServiceDevCommand],
};
