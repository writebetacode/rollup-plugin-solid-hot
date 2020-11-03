
import buble from '@rollup/plugin-buble';
import pkg from './package.json';
import { terser } from "rollup-plugin-terser";

const external = Object.keys(pkg.dependencies).concat('path');

export default {
  input: 'index.js',
  plugins: [
    buble({
      transforms: {
        asyncAwait: false,
        forOf: false
      }
    }),
    terser()
  ],
  external,
  output: [
    { file: pkg.main, format: 'cjs', exports: 'auto' },
  ]
};
