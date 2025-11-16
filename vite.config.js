import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // When building on GitHub Actions for GitHub Pages, set the base path
  // to the repository name so assets resolve correctly under /<repo>/.
  // Locally (dev) this remains '/'.
  base: process.env.GITHUB_ACTIONS === 'true'
    ? `/${(process.env.GITHUB_REPOSITORY || '').split('/')[1] || ''}/`
    : '/',
})
