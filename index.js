import { createFilter } from "@rollup/pluginutils";
import { dirname, extname, resolve } from "path";
import { existsSync, readFileSync } from "fs";
import { Parser } from "acorn";
import { base, simple } from "acorn-walk";
import { extend } from "acorn-jsx-walk";

module.exports = (options = {}) => {
  const filter = createFilter(options.include),
    isProduction = process.env.NODE_ENV === "production",
    extensions = [ ".js", ".jsx", ".ts", ".tsx" ],
    loaderName = "?solid-hot-loader",
    JSXParser = Parser.extend(require("acorn-jsx")()),
    acornOpts = { "sourceType": "module", "ecmaVersion": "2020" };

  extend(base);

  return {
    name: "solidHotLoader",

    resolveId: async function(importee, importer) {
      if (isProduction || !importer || importer.includes(loaderName)) {
        return null;
      }

      const id = resolve(dirname(importer), importee);
      if (extname(id) === "") {
        for (const ext of extensions) {
          const file = `${id}${ext}`;
          if (filter(file) && existsSync(file)) {
            return `${file}${loaderName}`;
          }
        }
      } else {
        if (filter(id)) {
          return `${id}${loaderName}`;
        }
      }

      return null;
    },

    load: async function(id) {
      if (!isProduction && id.endsWith(loaderName)) {
        let file = id.replace(loaderName, ""),
          code = readFileSync(file, "utf-8"),
          ast = JSXParser.parse(code, acornOpts),
          exports = {};

        simple(ast, {
          ExportDefaultDeclaration() {
            exports["default"] = 1;
          },
          ExportNamedDeclaration(node) {
            if (node.specifiers.length) {
              for (let specifier of node.specifiers) {
                exports[specifier.exported.name] = 1;
              }
            } else if (node.declaration) {
              if (node.declaration.declarations.length) {
                for (let exp of node.declaration.declarations) {
                  exports[exp.id.name] = 1;
                }
              } else if (node.declaration.id) {
                exports[node.declaration.id.name] = 1;
              }
            }
          }
        });

        let namedExports = Object.keys(exports)
          .filter(key => key != "default" && key[0].toUpperCase() == key[0]) ||
          [],
          importNames = "",
          exportStmt = "export {",
          wrappedComponentsCode = "",
          setComponentsCode = "";

        if (!exports.default && !namedExports.length) {
          return code;
        }

        if (exports.default) {
          importNames = `Comp${namedExports.length ? "," : ""}`;
          exportStmt = `export { Wrapped as default ${namedExports.length ? "," : "};"}`;

          wrappedComponentsCode = `
            const [s, set] = createSignal(Comp),
              Wrapped = (...args) => {
                let c;
                return () => (c = s()) && untrack(() => c(...args));
              };
          `;

          setComponentsCode = `set(Comp);`;
        }

        if (namedExports.length) {
          let wrappedNames = namedExports.map(cmp => `Wrapped${cmp} as ${cmp}`);
          importNames += `{ ${namedExports.join(", ")} }`;
          exportStmt += ` ${wrappedNames.join(", ")} };`;

          for (const name of namedExports) {
            wrappedComponentsCode += `
              const [s${name}, set${name}] = createSignal(${name}),
                Wrapped${name} = (...args) => {
                  let c;
                  return () => (c = s${name}()) && untrack(() => c(...args));
                };
            `;

            setComponentsCode += ` set${name}(${name});`;
          }
        }

        return `
          import { createSignal, untrack } from "solid-js";
          import ${importNames} from "${file}";
          ${wrappedComponentsCode}

          ${exportStmt}

          module && module.hot && module.hot.accept(({disposed}) => {
            for(const id of disposed.filter(id => id != module.id)) {
              require(id);
            }
            ${setComponentsCode}
          });
        `;
      }

      return null;
    },

    transform: async function(code, id) {
      if (!isProduction && !filter(id) && this.getModuleInfo(id).isEntry) {
        code = `
          module && module.hot && module.hot.accept(() => location.reload());
          ${code}
        `;
      }

      return { code };
    }
  };
};
