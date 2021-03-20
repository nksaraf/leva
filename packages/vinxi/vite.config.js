import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'
import jsx from 'vite-plugin-react-jsx'

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    include: ['leva', 'leva/plugin'],
  },
  define: {
    global: 'window',
  },
  plugins: [jsx(), reactRefresh()],
})
