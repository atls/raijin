import { Command } from '@oclif/command';
export default class ReleaseCommand extends Command {
    static description: string;
    static examples: string[];
    run(): Promise<void>;
    check(error?: any): Promise<void>;
}
