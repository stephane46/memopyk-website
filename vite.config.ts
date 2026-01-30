import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(async () => {
  const plugins: any[] = [react()];

  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'client', 'src'),
        '@shared': path.resolve(process.cwd(), 'shared'),
      },
    },
    root: path.resolve(process.cwd(), 'client'),
    publicDir: 'public',
    build: {
      outDir: path.resolve(process.cwd(), 'dist/public'),
      emptyOutDir: true,
      sourcemap: true,
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      fs: {
        strict: true,
        deny: ['**/.*'],
      },
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  };
});
