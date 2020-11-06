import { createFilter } from "@rollup/pluginutils";
import { fetchDefaultExport } from "./utils";
import { dirname, extname, resolve } from "path";
import { existsSync } from "fs";

module.exports = (options = {}) => {
  const filter = createFilter(options.include),
    isProduction = process.env.NODE_ENV === "production",
    extensions = [ ".js", ".jsx", ".ts", ".tsx" ],
    loaderName = "?solid-hot-loader";

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
          exportName = fetchDefaultExport(file);

        let namedExport = "";
        if (exportName != "") {
          namedExport = `, Wrapped as ${exportName}`;
        }

        return `
          import { createSignal, untrack } from "solid-js";
          import Comp from "${file}";
          const [s, set] = createSignal(Comp),
            Wrapped = props => {
              let c;
              return () => (c = s()) && untrack(() => c(props));
            };

          export { Wrapped as default${namedExport} };

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
