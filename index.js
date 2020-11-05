import { createFilter } from "@rollup/pluginutils";
const fs = require("fs");
const path = require("path");

function fetchDefaultExport(file) {
  const code = fs.readFileSync(file, "utf-8"),
    defaultExportReg = /export default/g,
    match = defaultExportReg.exec(code);

  if (match) {
    const index = match.index + 15;
    for (let i = index; i < code.length; i++) {
      const char = code[i];
      if (char === "\n" || char === ";" || char === " ") {
        return code.substring(index, i).trim();
      }
    }
  }

  return "";
}

module.exports = (options = {}) => {
  const filter = createFilter(options.include),
    isProduction = process.env.NODE_ENV === "production" ||
      process.env.production !== undefined,
    extensions = [ ".js", ".jsx", ".ts", ".tsx" ],
    loaderName = "?solid-hot-loader",
    compFiles = [];

  return {
    name: "solidHotLoader",

    resolveId: async function(importee, importer) {
      if (isProduction || !importer || compFiles.includes(importee))
        return null;

      const id = path.resolve(path.dirname(importer), importee);

      if (path.extname(id) !== "") {
        if (filter(id)) {
          compFiles.push(id);
          return `${id}${loaderName}`;
        }

        return null;
      }

      for(const ext of extensions) {
        const file = `${id}${ext}`;
        if(fs.existsSync(file) && filter(file)) {
          compFiles.push(file);
          return `${file}${loaderName}`;
        }
      }

      return null;
    },

    load: async function(id) {
      if (!isProduction && id.endsWith(loaderName)) {
        let file = id.replace(loaderName, ""),
          exportName = fetchDefaultExport(file);

        return `
          import { createSignal, untrack } from "solid-js";
          import Comp from "${file}";
          const [s, set] = createSignal(Comp);
          export const ${exportName} = props => {
            let c;
            return () => (c = s()) && untrack(() => c(props));
          };

          export default ${exportName};
          module && module.hot && module.hot.accept(({disposed}) => {
            for(const id of disposed.filter(id => id != module.id)) {
              require(id);
            }
            set(Comp);
          });
        `;
      }

      return null;
    },

    transform: async function(code, id) {
      if (isProduction) return

      const isEntry = this.getModuleInfo(id).isEntry;
      if (!filter(id) && isEntry) {
        code = `
          module && module.hot && module.hot.accept(() => location.reload());
          ${code}
        `;
      }

      return { code };
    }
  };
}
