const { apply, url, template, move } = require("@angular-devkit/schematics");
const { strings } = require("@angular-devkit/core");
const { chain } = require("@angular-devkit/schematics");
const { mergeWith } = require("@angular-devkit/schematics");
const { MergeStrategy } = require("@angular-devkit/schematics");
const { normalize } = require("@angular-devkit/core");

function main(options) {
  return (tree, context) => {
    const workflow = context.engine.workflow;

    console.log(workflow);
    console.log(context);

    if (workflow._dryRun) {
      console.info("🚀 Схема выполняется в dry-run!");
    } else {
      console.info("✅ Схема выполняется с реальными изменениями.");
    }

    const currentDir = process.cwd();
    console.info("Current working directory:", currentDir);

    const fullPath = normalize(`${currentDir}/hi/hello.txt`);
    console.info("Normalized path:", fullPath);

    tree.create(fullPath, "Hello, world123!");

    // Логирование всех действий
    tree.actions.forEach((action) => {
      console.log("ACTION Path:", action.path);
      console.log(
        "ACTION Content:",
        action.content?.toString().substring(0, 50)
      );
    });

    return tree;
  };
}

module.exports = { main };
