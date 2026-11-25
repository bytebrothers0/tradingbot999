import { createFileRoute } from '@tanstack/react-router';

const BINANCE_BASE = 'https://api.binance.com';
const BINANCE_TESTNET_BASE = 'https://testnet.binance.vision';

function getBaseUrl(testnet: string) {
  return testnet === 'true' ? BINANCE_TESTNET_BASE : BINANCE_BASE;
}

export const Route = createFileRoute('/api/binance/$')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const path = (params['$'] ?? params['*'] ?? '') as string;
        const testnet = url.searchParams.get('testnet') ?? 'true';
        const apiKey = url.searchParams.get('apiKey');

        // Remove proxy-specific params before forwarding
        const searchParams = new URLSearchParams(url.search);
        searchParams.delete('testnet');
        searchParams.delete('apiKey');

        const baseUrl = getBaseUrl(testnet);
        const targetUrl = `${baseUrl}/api/v3/${path}?${searchParams.toString()}`;

        console.log('[Binance Proxy] GET', targetUrl);

        const headers: Record<string, string> = {};
        if (apiKey) headers['X-MBX-APIKEY'] = apiKey;

        try {
          const res = await fetch(targetUrl, { headers });
          const data = await res.text();
          console.log('[Binance Proxy] Response status:', res.status);
          return new Response(data, {
            status: res.status,
            headers: {
              'content-type': res.headers.get('content-type') ?? 'application/json',
              'access-control-allow-origin': '*',
            },
          });
        } catch (e) {
          console.error('[Binance Proxy] Fetch error:', e);
          return new Response(JSON.stringify({ error: 'Proxy fetch failed', detail: String(e) }), { status: 502 });
        }
      },
      POST: async ({ request, params }) => {
        const url = new URL(request.url);
        const path = (params['$'] ?? params['*'] ?? '') as string;
        const testnet = url.searchParams.get('testnet') ?? 'true';
        const apiKey = url.searchParams.get('apiKey');

        const body = await request.text();
        const baseUrl = getBaseUrl(testnet);
        const targetUrl = `${baseUrl}/api/v3/${path}`;

        console.log('[Binance Proxy] POST', targetUrl, body);

        const headers: Record<string, string> = {
          'Content-Type': 'application/x-www-form-urlencoded',
        };
        if (apiKey) headers['X-MBX-APIKEY'] = apiKey;

        try {
          const res = await fetch(targetUrl, {
            method: 'POST',
            headers,
            body,
          });
          const data = await res.text();
          console.log('[Binance Proxy] Response status:', res.status);
          return new Response(data, {
            status: res.status,
            headers: {
              'content-type': res.headers.get('content-type') ?? 'application/json',
              'access-control-allow-origin': '*',
            },
          });
        } catch (e) {
          console.error('[Binance Proxy] Fetch error:', e);
          return new Response(JSON.stringify({ error: 'Proxy fetch failed', detail: String(e) }), { status: 502 });
        }
      },
      DELETE: async ({ request, params }) => {
        const url = new URL(request.url);
        const path = (params['$'] ?? params['*'] ?? '') as string;
        const testnet = url.searchParams.get('testnet') ?? 'true';
        const apiKey = url.searchParams.get('apiKey');

        const baseUrl = getBaseUrl(testnet);
        const searchParams = new URLSearchParams(url.search);
        searchParams.delete('testnet');
        searchParams.delete('apiKey');
        const targetUrl = `${baseUrl}/api/v3/${path}?${searchParams.toString()}`;

        console.log('[Binance Proxy] DELETE', targetUrl);

        const headers: Record<string, string> = {};
        if (apiKey) headers['X-MBX-APIKEY'] = apiKey;

        try {
          const res = await fetch(targetUrl, { method: 'DELETE', headers });
          const data = await res.text();
          console.log('[Binance Proxy] Response status:', res.status);
          return new Response(data, {
            status: res.status,
            headers: {
              'content-type': res.headers.get('content-type') ?? 'application/json',
              'access-control-allow-origin': '*',
            },
          });
        } catch (e) {
          console.error('[Binance Proxy] Fetch error:', e);
          return new Response(JSON.stringify({ error: 'Proxy fetch failed', detail: String(e) }), { status: 502 });
        }
      },
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
            'access-control-allow-headers': 'Content-Type, X-MBX-APIKEY',
          },
        });
      },
    },
  },
});