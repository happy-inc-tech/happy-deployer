import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default [
  {
    input: './src/index.ts',
    output: {
      file: './dist/index.cjs',
      format: 'cjs',
      sourcemap: false,
    },
    plugins: [typescript()],
  },
  {
    input: './src/index.ts',
    output: {
      file: './dist/index.js',
      format: 'es',
      sourcemap: false,
    },
    plugins: [typescript()],
  },
  {
    input: './src/index.ts',
    output: {
      file: './dist/index.d.ts',
      format: 'es',
    },
    plugins: [dts()],
  },
];
