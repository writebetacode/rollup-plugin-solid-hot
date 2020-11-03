import { createFilter } from "@rollup/pluginutils";
const fs = require("fs");
const path = require("path");

function hmrCode(file, compName) {
  return `
    import { createSignal, untrack } from "solid-js";
    import Comp from "${file}";
    const [s, set] = createSignal(Comp);
    export const ${compName} = props => {
      let c;
      return () => (c = s()) && untrack(() => c(props));
    };

    export default ${compName};
    if(module && module.hot) {
      module.hot.accept(() => {});

      module.hot.addStatusHandler(() => {
        if (module.hot.status() === "apply") {
          require(module.id);
          set(Comp);
        }
      });
    }
  `;
}

module.exports = (options = {}) => {
  const filter = createFilter(options.include),
    isProduction = process.env.NODE_ENV === "production" ||
      process.env.production !== undefined,
    extensions = [ ".js", ".jsx", ".ts", ".tsx" ],
    loaderName = "?solid-hot-loader",
    compFiles = [],
    importMap = {},
    isImportedByComponentFile = (id) => {
      if (!extensions.includes(path.extname(id))) return false;

      for (const file of compFiles) {
        if(importMap[file]) {
          for (const importName of importMap[file]) {
            if (id.indexOf(importName) >= 0) {
              return true;
            }
          }
        }
      }

      return false;
    }

  return {
    name: "solidHotLoader",

    resolveId: async function(importee, importer) {
      if (isProduction || !importer || compFiles.includes(importee))
        return null;

      const id = path.resolve(path.dirname(importer), importee);

      if (!importMap[importer]) {
        importMap[importer] = [];
      }

      if (!importMap[importer].includes(id)) {
        importMap[importer].push(id);
      }

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
          compName = path.parse(file).name;

        return hmrCode(file, compName);
      }

      return null;
    },

    transform: async function(code, id) {
      if (isProduction) return

      const isEntry = this.getModuleInfo(id).isEntry;
      if (!filter(id) && (isEntry || isImportedByComponentFile(id))) {
        code = `
          module && module.hot && module.hot.accept(() => location.reload());
          ${code}
        `;

        return { code, map: null };
      }

      return
    }
  };
}
