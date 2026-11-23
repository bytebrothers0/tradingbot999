import { createFileRoute } from '@tanstack/react-router';
import { Bots } from '@/components/tickpulse/bots';
export const Route = createFileRoute('/bots')({
  head: () => ({ meta: [{ title: 'TickPulse — Bot Builder' }, { name: 'description', content: 'Configure multi-asset bot strategies, timeframes, investment and risk presets in the TickPulse demo workspace.' }, { property: 'og:title', content: 'TickPulse — Bot Builder' }, { property: 'og:description', content: 'Configure multi-asset bot strategies, timeframes, investment and risk presets in the TickPulse demo workspace.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: Bots,
});
