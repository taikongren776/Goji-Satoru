import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: { rollupOptions: { input: ['index.html','character-study.html'], output: { manualChunks: { three: ['three'] } } } },
});
