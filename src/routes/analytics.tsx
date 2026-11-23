import { createFileRoute } from '@tanstack/react-router';
import { Analytics } from '@/components/tickpulse/analytics';
export const Route = createFileRoute('/analytics')({
  head: () => ({ meta: [{ title: 'TickPulse — Performance Analytics' }, { name: 'description', content: 'Explore demo trading performance, filter trade logs and export your TickPulse results.' }, { property: 'og:title', content: 'TickPulse — Performance Analytics' }, { property: 'og:description', content: 'Explore demo trading performance, filter trade logs and export your TickPulse results.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: Analytics,
});
