import { createFileRoute } from '@tanstack/react-router';
import { Wallet } from '@/components/tickpulse/wallet';
export const Route = createFileRoute('/wallet')({
  head: () => ({ meta: [{ title: 'TickPulse — Wallet & Accounts' }, { name: 'description', content: 'Manage TickPulse demo accounts and view the status of your Exness desktop connection.' }, { property: 'og:title', content: 'TickPulse — Wallet & Accounts' }, { property: 'og:description', content: 'Manage TickPulse demo accounts and view the status of your Exness desktop connection.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: Wallet,
});
