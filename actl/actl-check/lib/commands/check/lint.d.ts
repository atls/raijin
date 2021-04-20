import { Command } from '@oclif/command';
export default class LintCommand extends Command {
    static description: string;
    static examples: string[];
    run(): Promise<void>;
    check({ results }: any): Promise<void>;
}
