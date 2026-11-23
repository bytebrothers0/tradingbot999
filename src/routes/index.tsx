import { createFileRoute } from '@tanstack/react-router';
import { Dashboard } from '@/components/tickpulse/dashboard';
export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: 'TickPulse — Command Center' }, { name: 'description', content: 'Your personal multi-asset trading command center. Monitor demo portfolio equity, strategies and bot risk.' }, { property: 'og:title', content: 'TickPulse — Command Center' }, { property: 'og:description', content: 'A clear view of your markets, portfolio and trading bots.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: Dashboard,
});
