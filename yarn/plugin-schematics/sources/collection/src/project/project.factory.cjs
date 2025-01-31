async function loadFactory() {
  console.log("load factory");

  const module = await import(
    "/home/operator/Projects/atls_raijin/yarn/plugin-schematics/sources/collection/src/project.factory.js"
  );
  return module.default || module;
}

module.exports = loadFactory;
