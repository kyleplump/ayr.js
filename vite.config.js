import { defineConfig } from 'vite'
import { resolve } from 'path';

export default defineConfig({
 build: {
  sourcemap: true,
  lib: {
    entry: resolve(__dirname, 'src/component.js'),
    name: 'ayr.js',
    fileName: 'ayr'
  }
 }
})