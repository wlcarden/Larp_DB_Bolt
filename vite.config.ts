import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['date-fns', 'lucide-react', 'react', 'react-dom', 'react-router-dom']
  },
  build: {
    commonjsOptions: {
      include: [/date-fns/, /node_modules/]
    }
  }
});