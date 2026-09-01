import http from 'http';
import * as dotenv from 'dotenv';
import {
  handleCreateCheckoutSession,
  handleCreatePortalSession,
  handleStripeWebhook,
} from './api';

dotenv.config();

const PORT = parseInt(process.env.PORT || process.env.API_PORT || '3001', 10);

/**
 * Production-ready Standalone Billing & Webhook API Server.
 * 
 * Runs independently of Vite dev server.
 * Provides production-grade request logging, raw body preservation,
 * strict JWT bearer token authentication, and authoritative Stripe webhook handling.
 */
export function createBillingServer(): http.Server {
  const server = http.createServer(async (req, res) => {
    const startTime = Date.now();
    const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // CORS & Security Headers
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('Access-Control-Allow-Origin', process.env.APP_URL || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Stripe-Signature');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    // Health check endpoint
    if (pathname === '/api/health' || pathname === '/health') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        status: 'ok',
        service: 'mr-rajpoot-billing-api',
        timestamp: new Date().toISOString(),
      }));
      return;
    }

    if (!pathname.startsWith('/api/billing')) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Endpoint not found', requestId }));
      return;
    }

    try {
      // Read raw body
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const rawBuffer = Buffer.concat(chunks);
      const rawBody = rawBuffer.toString('utf8');

      // 1. Create Checkout Session
      if (pathname === '/api/billing/create-checkout-session' && req.method === 'POST') {
        const body = rawBody ? JSON.parse(rawBody) : {};
        const result = await handleCreateCheckoutSession(body, req.headers.authorization);
        
        console.log(`[BILLING_API] [${requestId}] POST /api/billing/create-checkout-session -> 200 (${Date.now() - startTime}ms)`);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
        return;
      }

      // 2. Create Customer Portal Session
      if (pathname === '/api/billing/create-portal-session' && req.method === 'POST') {
        const body = rawBody ? JSON.parse(rawBody) : {};
        const result = await handleCreatePortalSession(body, req.headers.authorization);

        console.log(`[BILLING_API] [${requestId}] POST /api/billing/create-portal-session -> 200 (${Date.now() - startTime}ms)`);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
        return;
      }

      // 3. Stripe Webhook (Raw body preserved for signature verification)
      if (pathname === '/api/billing/webhook' && req.method === 'POST') {
        const signature = req.headers['stripe-signature'] as string | undefined;
        const result = await handleStripeWebhook(rawBody, signature);

        console.log(`[BILLING_API] [${requestId}] POST /api/billing/webhook -> 200 (${Date.now() - startTime}ms)`);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
        return;
      }

      // Method not allowed / route not found
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `Cannot ${req.method} ${pathname}`, requestId }));
    } catch (err: any) {
      const errMsg = err.message || 'Internal Server Error';
      const isUnauthorized = typeof errMsg === 'string' && errMsg.startsWith('Unauthorized');
      const isBadRequest = typeof errMsg === 'string' && errMsg.startsWith('Bad Request');

      const statusCode = isUnauthorized ? 401 : isBadRequest ? 400 : 400;

      console.error(`[BILLING_API] [${requestId}] Error ${statusCode} on ${req.method} ${pathname}: ${errMsg}`);
      res.statusCode = statusCode;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        message: errMsg,
        requestId,
      }));
    }
  });

  return server;
}

// Auto-start if executed directly as entrypoint
if (process.argv[1] && process.argv[1].endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  const server = createBillingServer();
  server.listen(PORT, () => {
    console.log(`[BILLING_API] Standalone production server listening on http://localhost:${PORT}`);
  });
}
