import type { Rule } from "@angular-devkit/schematics";
import { apply, url, template, move } from "@angular-devkit/schematics";

function main(_options: any): Rule {
  return (tree, _context) => {
    console.log("console on main");

    const sourceTemplate = url("./files");

    console.log(sourceTemplate);

    const sourceParametrizedTemplate = apply(sourceTemplate, [
      template({}), // Шаблонные параметры (пока пусто)
      move("./"), // Переместить файлы в корень проекта
    ]);

    return sourceParametrizedTemplate;

    return tree;
  };
}

module.exports = { main };
