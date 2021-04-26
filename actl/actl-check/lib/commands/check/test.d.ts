import { Command } from '@oclif/command';
export default class TestCommand extends Command {
    static description: string;
    static examples: string[];
    run(): Promise<void>;
    check({ testResults }: any): Promise<void>;
}
