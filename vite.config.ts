import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'eip-712-signer': '/Users/antonioalarcon/Developer/UPC/SSI/eip-712-signer/src/index.ts', 
    },
  },
})
