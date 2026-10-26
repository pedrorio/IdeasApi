const babel = require("@babel/core");
const commonjs = require("@babel/plugin-transform-modules-commonjs");

// NestJS 12 and Apollo 5 publish ESM. The unit tests stay CommonJS, so Jest
// rewrites only those packages (see transformIgnorePatterns).
function replaceImportMeta() {
  return {
    visitor: {
      MetaProperty(path) {
        const isImportMeta = path.get("meta").isIdentifier({ name: "import" })
          && path.get("property").isIdentifier({ name: "meta" });
        if (isImportMeta) {
          path.replaceWithSourceString("({ url: \"file://\" + __filename })");
        }
      }
    }
  };
}

module.exports = {
  process(src, filename) {
    const result = babel.transformSync(src, {
      filename,
      babelrc: false,
      configFile: false,
      sourceMaps: false,
      compact: false,
      sourceType: "unambiguous",
      plugins: [
        replaceImportMeta,
        [commonjs, { importInterop: "node" }]
      ]
    });
    if (!result || typeof result.code !== "string") {
      throw new Error("Failed to transform ESM for Jest: " + filename);
    }
    return { code: result.code };
  }
};
