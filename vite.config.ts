import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const githubPagesBuild = process.env.GITHUB_ACTIONS === 'true';

  return {
    // Railway serves GLORIFIER from the domain root.
    // GitHub Pages project-site builds retain the repository subpath.
    base: process.env.CAPACITOR_BUILD === 'true'
      ? './'
      : githubPagesBuild
        ? '/glorifier-artificial-intelligence/'
        : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': import.meta.dirname,
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
