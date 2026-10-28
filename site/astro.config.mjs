import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

// Design system and content live outside the site folder (../design, ../content):
// one source of truth for the site, the specimen page and the concept PDF.
const root = fileURLToPath(new URL('..', import.meta.url));

// GitHub Pages project sites live under /<repo>/: CI passes SITE_URL and BASE_PATH,
// scripts/postbuild-base.mjs then prefixes the hard-coded root links in the built HTML.
export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  build: { format: 'directory', inlineStylesheets: 'always' },
  vite: {
    server: { fs: { allow: [root] } },
    resolve: {
      alias: {
        '@ds': fileURLToPath(new URL('../design/system', import.meta.url)),
        '@content': fileURLToPath(new URL('../content', import.meta.url)),
      },
    },
  },
});
