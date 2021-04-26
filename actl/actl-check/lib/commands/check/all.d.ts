import { Command } from '@oclif/command';
export default class AllCommand extends Command {
    static description: string;
    static examples: string[];
    run(): Promise<void>;
}
