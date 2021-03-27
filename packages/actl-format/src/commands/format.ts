import { Command } from "clipanion";
import execa from "execa";
import {
  PRETTIER_CONFIG_PATH,
  PRETTIER_IGNORE_PATH,
} from "@atlantis-lab/config";
import { join } from "path";

export default class FormatCommand extends Command {
  // static description: string = 'Prettier format'
  // static examples: string[] = ['$ actl format']

  static paths = [["format"]];

  async execute(): Promise<void> {
    try {
      await execa(
        "prettier",
        [
          "--write",
          "--config",
          PRETTIER_CONFIG_PATH,
          "--ignore-path",
          PRETTIER_IGNORE_PATH,
          join(
            process.cwd(),
            "./**/*.{js,ts,tsx,yml,yaml,json,graphql,md,mdx}"
          ),
        ],
        { stdio: "inherit" }
      );
    } catch (error) {
      this.context.stdout.write(`${error.stderr}`);
    }
  }
}
