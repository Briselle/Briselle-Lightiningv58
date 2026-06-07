import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const zivaProxyTarget = env.VITE_ZIVA_PROXY_TARGET || 'http://127.0.0.1:5199';

  return {
    plugins: [react()],
    optimizeDeps: {
      include: [
        '@blocknote/core',
        '@blocknote/react',
        '@blocknote/mantine',
        '@mantine/core',
        '@mantine/hooks',
        'lucide-react',
      ],
    },
    server: {
      proxy: {
        '/api/ziva': {
          target: zivaProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
