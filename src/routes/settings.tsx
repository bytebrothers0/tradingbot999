import { createFileRoute } from '@tanstack/react-router';
import { Settings } from '@/components/tickpulse/settings';
export const Route = createFileRoute('/settings')({
  head: () => ({ meta: [{ title: 'TickPulse — System Settings' }, { name: 'description', content: 'Set global risk limits, AI assistant permissions and Exness session preferences in TickPulse.' }, { property: 'og:title', content: 'TickPulse — System Settings' }, { property: 'og:description', content: 'Set global risk limits, AI assistant permissions and Exness session preferences in TickPulse.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: Settings,
});
