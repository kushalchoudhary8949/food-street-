import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildTimestamp = Date.now().toString();

const versionPlugin = () => ({
  name: 'version-generator',
  buildStart() {
    const publicDir = path.resolve(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    fs.writeFileSync(
      path.resolve(publicDir, 'version.json'),
      JSON.stringify({ version: buildTimestamp, builtAt: new Date().toISOString() }, null, 2)
    );
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), versionPlugin()],
  define: {
    __APP_BUILD_TIME__: JSON.stringify(buildTimestamp),
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});

