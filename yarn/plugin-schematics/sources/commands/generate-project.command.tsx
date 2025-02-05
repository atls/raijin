/* eslint-disable */

import { BaseCommand } from "@yarnpkg/cli";
import { Configuration } from "@yarnpkg/core";
import { Project } from "@yarnpkg/core";
import { StreamReport } from "@yarnpkg/core";

import { getStreamReportCallback } from "../getters/index.js";
import { getStreamReportOptions } from "../getters/index.js";

export class GenerateProjectCommand extends BaseCommand {
  static override paths = [["generate", "project"]];

  async execute() {
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins
    );

    // TODO is needed?
    // const { project, workspace } = await Project.find(configuration, this.context.cwd)

    const options = {
      type: "project",
      cwd: process.cwd(),
    };

    const streamReportOptions = getStreamReportOptions(this, configuration);
    const streamReportCallback = getStreamReportCallback(options);

    const commandReport = await StreamReport.start(
      streamReportOptions,
      streamReportCallback
    );

    return commandReport.exitCode();
  }
}
