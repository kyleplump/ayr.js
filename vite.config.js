import { defineConfig } from 'vite'
import { resolve } from 'path';

export default defineConfig({
 build: {
  minify: 'terser',
  lib: {
    entry: resolve(__dirname, 'src/component.js'),
    name: 'Ayr.js',
    fileName: 'ayr'
  }
 }
})