import { Rule, apply, url, template, move } from "@angular-devkit/schematics";

export function main(_options) {
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
