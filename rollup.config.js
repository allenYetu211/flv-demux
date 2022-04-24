/*
 * @Date: 2022-04-13 17:10:11
 * @LastEditTime: 2022-04-13 17:32:21
 */
import typescript from 'rollup-plugin-typescript2';
import commonjs from 'rollup-plugin-commonjs';
import clear from 'rollup-plugin-clear';
import json from 'rollup-plugin-json';
import serve from 'rollup-plugin-serve';
import resolve from 'rollup-plugin-node-resolve';

import path from 'path';

import tsconfig from './tsconfig.json';

const resolveFile = function (filePath) {
  return path.join(__dirname, filePath)
}


export default {
  input: './src/index.ts',
  output: [
    {
      name: 'FlvDemux',
      file: 'lib/index.iife.js',
      format: 'iife',
      sourcemap: true,
    },
    {
      name: 'FlvDemux',
      format: 'cjs',
      file: 'lib/index.cjs.js',
      sourcemap: true,
    },
    {
      name: 'FlvDemux',
      format: 'umd',
      file: 'lib/index.umd.js',
      sourcemap: true,
    },
    {
      name: 'FlvDemux',
      format: 'esm',
      file: 'lib/index.esm.js',
      sourcemap: true,
    },
  ],
  plugins: [
    clear({
      targets: ['lib']
    }),

    typescript({
      exclude: 'node_modules/**',
      tsconfigDefaults: tsconfig
    }),
    resolve(),
    commonjs({
      include: ['node_modules/eventemitter3/**']
    }),
    json({
      compact: true
    }),
    //  开发配置
    serve({
      port: 3000,
      contentBase: [resolveFile('examples'), resolveFile('lib')]
    }),
  ],

};
