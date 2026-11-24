import { createFileRoute } from '@tanstack/react-router';
import { streamResponse, GatewayError } from '@lovable.dev/ai-gateway';

type ChatMsg = { role: 'user' | 'assistant'; content: string };

const INSTRUCTIONS = `You are the TickPulse Bot AI Assistant inside a personal trading terminal running in DEMO mode.
All bots, balances and prices are simulated; MT5/Exness is not connected. Never claim to place real orders or that data is live.
Help the user think through bot strategy (AI Auto, AI Grid, AI DCA, AI Scalper), risk presets (Conservative 0.5%, Optimal 1%, Aggressive 2% per trade), stop loss / take profit, and drawdown limits.
Be concise, practical, and remind them trading carries risk when relevant. This is not financial advice.`;

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as { messages?: ChatMsg[]; context?: string } | null;
        const messages = (body?.messages ?? [])
          .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .slice(-30)
          .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
        if (!messages.length) return new Response('No messages', { status: 400 });
        const ctx = typeof body?.context === 'string' ? `\n\nCurrent demo state: ${body.context.slice(0, 2000)}` : '';
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              const events = await streamResponse({ model: 'openai/gpt-6.1-sol', instructions: INSTRUCTIONS + ctx, input: messages });
              for await (const ev of events) {
                if (ev.type === 'response.output_text.delta') controller.enqueue(encoder.encode(ev.delta));
              }
            } catch (e) {
              console.error(e);
              const msg = e instanceof GatewayError && e.httpStatus === 402 ? 'AI credits are used up.' : e instanceof GatewayError && e.httpStatus === 429 ? 'Too many requests, try again shortly.' : 'The assistant could not reply.';
              controller.enqueue(encoder.encode(`\n\n[${msg}]`));
            }
            controller.close();
          },
        });
        return new Response(stream, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-cache' } });
      },
    },
  },
});
