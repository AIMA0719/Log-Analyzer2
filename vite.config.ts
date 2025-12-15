
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
    define: {
      // This exposes the API_KEY from .env to the client-side code as process.env.API_KEY
      // Fallback to the provided key if env.API_KEY is missing
      'process.env.API_KEY': JSON.stringify(env.API_KEY || "AIzaSyD2fPBDEujzhBBjBh8SRvh27T0wLNkH1Ps"),
    },
  };
});