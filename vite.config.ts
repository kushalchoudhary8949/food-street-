import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import url from 'url';
import { defineConfig, type Plugin } from 'vite';

function apiDevServerPlugin(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        try {
          const parsedUrl = url.parse(req.url, true);
          const pathname = parsedUrl.pathname || '';
          const endpoint = pathname.replace(/^\/api\//, '').split('/')[0];

          // Read body for POST/PUT/PATCH/DELETE
          let body: any = null;
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method || '')) {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            const rawBody = Buffer.concat(chunks).toString('utf-8');
            if (rawBody) {
              try {
                body = JSON.parse(rawBody);
              } catch {
                body = rawBody;
              }
            }
          }

          // Attach query and body to req
          (req as any).query = parsedUrl.query;
          (req as any).body = body;

          // Attach res helper methods if missing
          (res as any).status = function (statusCode: number) {
            this.statusCode = statusCode;
            return this;
          };
          (res as any).json = function (data: any) {
            this.setHeader('Content-Type', 'application/json');
            this.end(JSON.stringify(data));
            return this;
          };

          let handler: any = null;
          if (endpoint === 'orders') {
            const mod = await server.ssrLoadModule('./api/orders.ts');
            handler = mod.default;
          } else if (endpoint === 'stores') {
            const mod = await server.ssrLoadModule('./api/stores.ts');
            handler = mod.default;
          } else if (endpoint === 'categories') {
            const mod = await server.ssrLoadModule('./api/categories.ts');
            handler = mod.default;
          } else if (endpoint === 'seed') {
            const mod = await server.ssrLoadModule('./api/seed.ts');
            handler = mod.default;
          } else if (endpoint === 'status') {
            const mod = await server.ssrLoadModule('./api/status.ts');
            handler = mod.default;
          }

          if (handler) {
            await handler(req, res);
          } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: `Route not found: ${pathname}` }));
          }
        } catch (err: any) {
          console.error('API Dev Server error:', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }));
          }
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiDevServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
