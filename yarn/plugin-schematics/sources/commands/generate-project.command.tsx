/* eslint-disable */

import { BaseCommand } from "@yarnpkg/cli";
import { Configuration } from "@yarnpkg/core";
import { Project } from "@yarnpkg/core";
import { StreamReport } from "@yarnpkg/core";

import { getStreamReportCallback } from "../getters/index.js";
import { getStreamReportOptions } from "../getters/index.js";
import { Option } from "clipanion";

export class GenerateProjectCommand extends BaseCommand {
  static override paths = [["generate"]];

  type = Option.String("-t,--type", "project");

  async execute() {
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins
    );

    console.log("generate project command 1");

    // TODO is needed?
    // const { project, workspace } = await Project.find(configuration, this.context.cwd)

    const allowedTypes = ["libraries", "project"];

    console.log("generate project command 2");

    if (!allowedTypes.includes(this.type)) {
      throw new Error(`Allowed only ${allowedTypes.join(", ")} types`);
    }

    console.log("generate project command 3");

    const options = {
      type: this.type,
      cwd: process.cwd(),
    };

    console.log("generate project command 4");

    const streamReportOptions = getStreamReportOptions(this, configuration);
    console.log("generate project command 41");
    const streamReportCallback = getStreamReportCallback(options);

    console.log("generate project command 5");

    const commandReport = await StreamReport.start(
      streamReportOptions,
      streamReportCallback
    );

    console.log("generate project command 6");

    return commandReport.exitCode();
  }
}
