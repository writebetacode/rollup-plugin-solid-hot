# rollup-plugin-solid-hot-loader

A simple solid-js Hot Module Replacement loader for [Rollup](https://rollupjs.org) when used with [Nollup](https://github.com/PepsRyuu/nollup). As this loader currently only wraps your Solid Components, it does not preserve downstream state so the Component and all of it's children will be replaced. This loader also provides basic live-reloading support for the entry file.

## Installation

`npm install -D rollup-plugin-solid-hot-loader`

## Usage

```js
// rollup.config.js
import babel from "@rollup/plugin-babel";
import resolve from "@rollup/plugin-node-resolve";
import solidHotLoader from "rollup-plugin-solid-hot-loader";

isProduction = process.env.NODE_ENV === "production";

export default {
  ...,
  plugins: [{
    // Note: Call solidHotLoader before resolving and transpiling your code.
    !isProduction && solidHotLoader({
      include: ["**/path/to/components/**/*.jsx"]
    }),
    resolve({ extensions: [".js", ".jsx"] }),
    babel({
      babelHelpers: "bundled",
      exclude: "node_modules/**",
      presets: [ "solid" ]
    })
  }]
}

```

```js
// package.json
{
  ...,
  scripts: {
    "start": "nollup -c --hot"
  }
}
```

## Make sure to export your Solid Components

```js
/*
  The HMR Wrapping process operates on named exports starting with a capital
  letter and or the default export of the file.

  In the following example, it will wrap the `App` and `default` components in
  order for them to properly reload without a full refresh of the page.

  src/components/App/App.jsx
*/
export const App = () => {
  return <div class="app">Hello World!</div>;
};

export default App;
```

## Options

### `include`

Type: `String | RegExp | Array[...String|RegExp]`

A [minimatch pattern](https://github.com/isaacs/minimatch), or array of patterns, which specifies all of the Solid Component files the plugin should operate on.

## Notes

- External state managers may alleviate the loss of state during module replacement and provide a better development experience (i.e. [storeon](https://github.com/storeon/solidjs)).

## Inspiration

- [solid-hot-loader](https://github.com/ryansolid/solid-hot-loader)
