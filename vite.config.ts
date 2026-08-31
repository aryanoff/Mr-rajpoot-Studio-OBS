import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import { handleCreateCheckoutSession, handleCreatePortalSession, handleStripeWebhook } from './src/server/api';

dotenv.config();

function billingApiPlugin() {
  return {
    name: 'billing-api-middleware',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url?.startsWith('/api/billing')) {
          return next();
        }

        const url = new URL(req.url, 'http://localhost:5173');
        const pathname = url.pathname;

        try {
          // Read request body
          const chunks: any[] = [];
          for await (const chunk of req) {
            chunks.push(chunk);
          }
          const rawBody = Buffer.concat(chunks).toString('utf8');

          if (pathname === '/api/billing/create-checkout-session' && req.method === 'POST') {
            const body = rawBody ? JSON.parse(rawBody) : {};
            const result = await handleCreateCheckoutSession(body, req.headers.authorization);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
            return;
          }

          if (pathname === '/api/billing/create-portal-session' && req.method === 'POST') {
            const body = rawBody ? JSON.parse(rawBody) : {};
            const result = await handleCreatePortalSession(body, req.headers.authorization);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
            return;
          }

          if (pathname === '/api/billing/webhook' && req.method === 'POST') {
            const signature = req.headers['stripe-signature'];
            const result = await handleStripeWebhook(rawBody, signature);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
            return;
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Endpoint not found' }));
        } catch (err: any) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ message: err.message || 'Internal Server Error' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), billingApiPlugin()],
});
