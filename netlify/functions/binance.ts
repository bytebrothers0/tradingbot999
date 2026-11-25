import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const BINANCE_BASE = "https://api.binance.com";
const BINANCE_TESTNET_BASE = "https://testnet.binance.vision";

interface BinanceRequest {
  path: string;
  method: "GET" | "POST" | "DELETE";
  params: Record<string, string>;
  testnet?: boolean;
  apiKey?: string;
  apiSecret?: string;
}

function getBaseUrl(testnet: boolean): string {
  return testnet ? BINANCE_TESTNET_BASE : BINANCE_BASE;
}

async function signParams(params: Record<string, string>, secret: string): Promise<string> {
  const queryString = new URLSearchParams(params).toString();
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(queryString);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, msgData);
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { path, method = "GET", params = {}, testnet = true, apiKey, apiSecret } = body as BinanceRequest;

    if (!path) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing path" }) };
    }

    const baseUrl = testnet ? BINANCE_TESTNET_BASE : BINANCE_BASE;
    let targetUrl: string;
    let fetchOptions: RequestInit = { method, headers: {} };

    if (method === "GET" || method === "DELETE") {
      const searchParams = new URLSearchParams(params);
      if (apiKey) {
        // For signed requests, add signature
        if (apiSecret) {
          const timestamp = Date.now().toString();
          const allParams = { ...params, timestamp };
          const signature = await signParams(allParams, apiSecret);
          searchParams.set("signature", signature);
          searchParams.set("timestamp", timestamp);
        }
        fetchOptions.headers = { "X-MBX-APIKEY": apiKey };
      }
      targetUrl = `${baseUrl}${path}?${searchParams.toString()}`;
    } else if (method === "POST") {
      if (apiKey) fetchOptions.headers = { "X-MBX-APIKEY": apiKey };
      if (apiSecret) {
        const timestamp = Date.now().toString();
        const allParams = { ...params, timestamp };
        const signature = await signParams(allParams, apiSecret);
        allParams.signature = signature;
        fetchOptions.body = new URLSearchParams(allParams).toString();
      } else {
        fetchOptions.body = new URLSearchParams(params).toString();
      }
      fetchOptions.headers = { ...fetchOptions.headers, "Content-Type": "application/x-www-form-urlencoded" };
      targetUrl = `${baseUrl}${path}`;
    } else {
      return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    return {
      statusCode: response.status,
      headers: { ...headers, "Content-Type": response.headers.get("Content-Type") || "application/json" },
      body: data,
    };
  } catch (error) {
    console.error("Binance proxy error:", error);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: "Proxy error", detail: String(error) }),
    };
  }
};

export { handler };