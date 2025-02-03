const { apply, url, template, move } = require("@angular-devkit/schematics");
const { strings } = require("@angular-devkit/core");
const { chain } = require("@angular-devkit/schematics");
const { mergeWith } = require("@angular-devkit/schematics");
const { MergeStrategy } = require("@angular-devkit/schematics");

const generateCommon = (options) =>
  apply(url("./files/common"), [
    template({
      ...strings,
      ...options,
      dot: ".",
    }),
    move("./"),
  ]);

function main(options) {
  return chain([mergeWith(generateCommon(options), MergeStrategy.Overwrite)]);
}

module.exports = { main };
