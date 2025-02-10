/* eslint-disable react/jsx-no-leaked-render */
/* eslint-disable n/no-sync */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { BaseCommand } from "@yarnpkg/cli";
import { Configuration } from "@yarnpkg/core";
import { Project } from "@yarnpkg/core";
import { Filename } from "@yarnpkg/fslib";
import { scriptUtils } from "@yarnpkg/core";
import { execUtils } from "@yarnpkg/core";
import { xfs } from "@yarnpkg/fslib";
import { ppath } from "@yarnpkg/fslib";
import { npath } from "@yarnpkg/fslib";
import { Option } from "clipanion";
import { Command } from "clipanion";
import { render } from "ink";
import { relative } from "node:path";
import { isEnum } from "typanion";
import React from "react";

import { ErrorInfo } from "@atls/cli-ui-error-info-component";
import { LogRecord } from "@atls/cli-ui-log-record-component";
import { RawOutput } from "@atls/cli-ui-raw-output-component";
import { TestFailure } from "@atls/cli-ui-test-failure-component";
import { TestProgress } from "@atls/cli-ui-test-progress-component";
import { Tester } from "@atls/code-test";
import { renderStatic } from "@atls/cli-ui-renderer-static-component";

export abstract class AbstractTestCommand extends BaseCommand {
  static override usage = Command.Usage({
    description: "Run tests",
    details: `
    Run either integration or unit tests with Node.js built-in test runner.
    
    Integration tests are defined by placing *.test.[j|t]sx? in 'integration' folder anywhere.
    
    Unit tests are all *.test.[j|t]sx? except in 'integration' folder.
    `,
    examples: [
      ["Run all unit tests", "yarn test unit"],
      ["Run all integration tests", "yarn test integration"],
      [
        `Run all integration tests which file names include 'menu'`,
        "yarn test integration menu",
      ],
      [
        `Run all unit tests in watch mode - reloading after any change in file`,
        "yarn test unit -w",
      ],
    ],
  });

  target = Option.String("-t,--target");

  watch: boolean = Option.Boolean("-w,--watch", false);

  files: Array<string> = Option.Rest({ required: 0 });

  testReporter = Option.String("--test-reporter", {
    validator: isEnum(["tap"]),
  });

  private std = new Map<string | undefined, Array<string>>();

  private bufferedStdTimeout: NodeJS.Timeout | undefined;

  async executeProxy(type?: "integration" | "unit"): Promise<number> {
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins
    );
    const { project, workspace } = await Project.find(
      configuration,
      this.context.cwd
    );

    const args: Array<string> = [];

    if (this.files?.length) {
      args.push(this.files.join(" "));
    }

    if (this.watch) {
      args.push("-w");
    }

    if (workspace) {
      args.push("-t");
      args.push(this.context.cwd);
    }

    if (this.testReporter) {
      args.push(`--test-reporter=${this.testReporter}`);
    }

    const binFolder = await xfs.mktempPromise();

    const env = await scriptUtils.makeScriptEnv({ binFolder, project });

    if (!env.NODE_OPTIONS?.includes("--no-warnings")) {
      env.NODE_OPTIONS = `${env.NODE_OPTIONS} --no-warnings=DeprecationWarning`;
    }

    if (!env.NODE_OPTIONS?.includes("@atls/code-runtime/ts-node-register")) {
      env.NODE_OPTIONS = `${env.NODE_OPTIONS} --loader @atls/code-runtime/ts-node-register`;
      env.NODE_OPTIONS = `${env.NODE_OPTIONS} --loader ${
        pathToFileURL(
          npath.fromPortablePath(ppath.join(project.cwd, Filename.pnpEsmLoader))
        ).href
      }`;
      env.NODE_OPTIONS = `${env.NODE_OPTIONS} --loader @atls/code-runtime/ts-ext-register`;
    }

    if (!env.NODE_OPTIONS?.includes("--enable-source-maps")) {
      env.NODE_OPTIONS = `${env.NODE_OPTIONS} --enable-source-maps`;
    }

    const { code } = await execUtils.pipevp(
      "yarn",
      ["test", type ?? "", ...args],
      {
        cwd: project.cwd,
        stdin: this.context.stdin,
        stdout: this.context.stdout,
        stderr: this.context.stderr,
        env,
      }
    );

    return code;
  }

  async executeRegular(type: "integration" | "unit"): Promise<number> {
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins
    );
    const { project } = await Project.find(configuration, this.context.cwd);

    const onStdout = (data: TestStdout): void => {
      this.bufferedStd(data, (stdBuffer) => {
        this.renderStdBuffer(stdBuffer);
      });
    };

    const onStderr = (data: TestStderr): void => {
      this.bufferedStd(data, (stdBuffer) => {
        this.renderStdBuffer(stdBuffer);
      });
    };

    const onFail = (data: TestFail): void => {
      const source = data.file ? readFileSync(data.file, "utf8") : undefined;

      renderStatic(
        <TestFailure
          details={data.details}
          source={source}
          file={data.file ? relative(project.cwd, data.file) : undefined}
          column={data.column}
          line={data.line}
        />
      )
        .split("\n")
        .forEach((line) => {
          console.error(line); // eslint-disable-line no-console
        });
    };

    const tester = await Tester.initialize();

    tester.on("test:stdout", onStdout);
    tester.on("test:stderr", onStderr);
    tester.on("test:fail", onFail);

    const { clear } = render(
      <TestProgress cwd={project.cwd} tester={tester} />
    );

    try {
      const results =
        type === "integration"
          ? await tester.integration(this.target ?? project.cwd, {
              files: this.files,
              watch: this.watch,
            })
          : await tester.unit(this.target ?? project.cwd, {
              files: this.files,
              watch: this.watch,
            });

      return results.find((result) => result.type === "test:fail") ? 1 : 0;
    } catch (error) {
      if (error instanceof Error) {
        renderStatic(<ErrorInfo error={error} />)
          .split("\n")
          .forEach((line) => {
            console.error(line); // eslint-disable-line no-console
          });
      } else {
        console.error(error); // eslint-disable-line no-console
      }

      return 1;
    } finally {
      this.flushBufferedStd();

      tester.off("test:stdout", onStdout);
      tester.off("test:stderr", onStderr);
      tester.off("test:fail", onFail);

      clear();
    }
  }

  private bufferedStd(
    data: TestStderr | TestStdout,
    callback: (params: { file?: string; messages: Array<string> }) => void
  ): void {
    if (this.std.keys().next().value) {
      if (this.std.has(data.file)) {
        this.std.get(data.file)?.push(data.message);

        if (this.bufferedStdTimeout) {
          clearTimeout(this.bufferedStdTimeout);
        }

        this.bufferedStdTimeout = setTimeout(() => {
          const key: string | undefined = this.std.keys().next().value;

          callback({ file: key, messages: this.std.get(key) ?? [] });

          this.std.delete(key);
        }, 100);
      } else {
        const key: string | undefined = this.std.keys().next().value;

        callback({ file: key, messages: this.std.get(key) ?? [] });

        this.std.delete(key);

        this.std.set(data.file, [data.message]);
      }
    } else {
      this.std.set(data.file, [data.message]);
    }
  }

  private renderStdBuffer({
    file,
    messages,
  }: {
    file?: string;
    messages: Array<string>;
  }): void {
    const items = messages
      .map((message) => message.split("\n").filter(Boolean))
      .flat();

    const { logRecords, raw } = items.reduce(
      (
        result: { logRecords: Array<unknown>; raw: Array<string> },
        item: string
      ) => {
        try {
          const logRecord = JSON.parse(item);

          return {
            ...result,
            logRecords: [...result.logRecords, logRecord],
          };
        } catch {
          return {
            ...result,
            raw: [...result.raw, item],
          };
        }
      },
      { logRecords: [], raw: [] }
    );

    logRecords.forEach((logRecord) => {
      // eslint-disable-next-line no-console
      console.log(renderStatic(<LogRecord {...logRecord} />));
    });

    if (raw.length > 0) {
      // eslint-disable-next-line no-console
      console.log(
        renderStatic(
          <RawOutput
            file={file ? relative(process.cwd(), file) : undefined}
            messages={raw}
          />
        )
      );
    }
  }

  private flushBufferedStd(): void {
    this.std.forEach((messages, file) => {
      this.renderStdBuffer({ file, messages });
    });
  }
}
