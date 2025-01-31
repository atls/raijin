/* eslint-disable */

// import type { ProjectInformationProperties } from "@atls/cli-ui-schematics-component";
//
import { BaseCommand } from "@yarnpkg/cli";
import { Configuration } from "@yarnpkg/core";
import { Project } from "@yarnpkg/core";
import { getStreamReportCallback } from "../getters/index.js";
// import { MessageName } from "@yarnpkg/core";
import { StreamReport } from "@yarnpkg/core";
// import { xfs } from "@yarnpkg/fslib";
// import { npath } from "@yarnpkg/fslib";
// import { renderForm } from "@yarnpkg/libui/sources/misc/renderForm.js";
// import { Option } from "clipanion";
// import { forceStdinTty } from "force-stdin-tty";
// import { isOneOf } from "typanion";
// import { isLiteral } from "typanion";
// import { isOptional } from "typanion";
// import React from "react";
//
// import { ErrorInfo } from "@atls/cli-ui-error-info-component";
// import { RequestProjectInformation } from "@atls/cli-ui-schematics-component";
// import { ProjectType } from "@atls/schematics";
// import { SpinnerProgress } from "@atls/yarn-run-utils";
// import { renderStatic } from "@atls/cli-ui-renderer-static-component";

import { getStreamReportOptions } from "../getters/index.js";

export class GenerateProjectCommand extends BaseCommand {
  static override paths = [["generate", "project"]];

  // // @ts-expect-error any
  // type = Option.String("-t,--type", {
  //   validator: isOptional(
  //     isOneOf(
  //       [isLiteral(ProjectType.PROJECT), isLiteral(ProjectType.LIBRARIES)],
  //       {
  //         exclusive: true,
  //       }
  //     )
  //   ),
  // });

  // private async requestOptions(): Promise<
  //   ProjectInformationProperties | undefined
  // > {
  //   if (this.type) {
  //     return {
  //       // @ts-expect-error any
  //       type: this.type,
  //     };
  //   }
  //
  //   const overwroteStdin = forceStdinTty();
  //
  //   const options: ProjectInformationProperties | undefined = await renderForm(
  //     // @ts-expect-error any
  //     SubmitInjectedComponentFactory<ProjectInformationProperties>(
  //       RequestProjectInformation
  //     ),
  //     {},
  //     {
  //       stdin: this.context.stdin,
  //       stdout: this.context.stdout,
  //       stderr: this.context.stderr,
  //     }
  //   );
  //
  //   if (overwroteStdin) {
  //     process.stdin.destroy();
  //   }
  //
  //   return options;
  // }

  async execute() {
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins
    );

    const { project, workspace } = await Project.find(
      configuration,
      this.context.cwd
    );

    // const options = await this.requestOptions();
    //
    // if (!options) {
    //   return 1;
    // }

    // TODO component
    // const schematics = "bla" as any;
    // const schematics = new SchematicsWorker(project.cwd)

    const streamReportOptions = getStreamReportOptions(this, configuration);
    const streamReportCallback = getStreamReportCallback();

    const commandReport = await StreamReport.start(
      streamReportOptions,
      streamReportCallback
    );

    // return commandReport.exitCode();
  }
}
