import pkg from './package.json';
import buble from '@rollup/plugin-buble';
import { terser } from "rollup-plugin-terser";

const external = Object.keys(pkg.dependencies).concat(...[ "fs", "path" ]);

export default {
  input: './src/index.js',
  plugins: [
    buble({ transforms: { asyncAwait: false, forOf: false }}),
    terser()
  ],
  external,
  output: [
    { file: pkg.main, format: 'cjs', exports: 'auto' },
  ]
};
