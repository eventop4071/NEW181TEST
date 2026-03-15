import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// 모든 에셋은 frontend/public 폴더에 있으므로 XAMPP 프록시 불필요
export default defineConfig({
  plugins: [react()],
})
