import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: './src/index.ts',
  },
  name: 'Happy Deployer (lyohaplotinka version)',
  format: ['esm', 'cjs'],
  clean: true,
  splitting: false,
  minify: false,
  dts: true,
});
