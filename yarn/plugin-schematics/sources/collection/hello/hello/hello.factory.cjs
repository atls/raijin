const {
  Rule,
  apply,
  url,
  template,
  move,
} = require("@angular-devkit/schematics");

function main(_options) {
  return (tree, _context) => {
    // Генерация файла hello.txt
    const sourceTemplate = url("./files");
    const sourceParametrizedTemplate = apply(sourceTemplate, [
      template({}), // Шаблонные параметры (пока пусто)
      move("./"), // Переместить файлы в корень проекта
    ]);

    return sourceParametrizedTemplate;
  };
}

module.exports = { main };
