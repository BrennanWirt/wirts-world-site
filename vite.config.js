import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { writeFileSync, readFileSync } from 'fs'

const copy404Plugin = () => ({
  name: 'copy-404',
  closeBundle() {
    const dist = resolve('dist')
    const html = readFileSync(resolve(dist, 'index.html'), 'utf-8')
    writeFileSync(resolve(dist, '404.html'), html)
  }
})

export default defineConfig({
  plugins: [react(), copy404Plugin()],
  base: '/',
})
