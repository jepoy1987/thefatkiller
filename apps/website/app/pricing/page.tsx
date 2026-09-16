import type { Metadata } from 'next';
import { CtaBand } from '../../components/cta-band';
import { PricingTable } from '../../components/pricing-table';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'TFK pricing is coming soon. Public plans, prices, billing terms, and checkout are not yet finalized.',
};

const faqs = [
  ['Are plans and prices final?', 'No. Public plan names, tiers, prices, billing terms, and checkout are not finalized or live.'],
  ['What does subscription foundation mean?', 'The current MVP includes the product foundation needed for subscriptions. It does not mean a specific public offer or checkout flow is available.'],
  ['Are coaching, workouts, GLP-1 journaling, or AI insights included?', 'No current plan promise is being made for those features. They are labeled as future expansion and any packaging still requires approval.'],
  ['Can I use TFK today?', 'Use Open TFK App to see the current product access available to your account.'],
  ['Where can I ask a pricing question?', 'Use Contact TFK and the team can respond with the latest approved information.'],
];

export default function PricingPage() {
  return (
    <main id="main-content">
      <section className="page-hero pricing-hero"><div className="container centered-hero"><p className="eyebrow">Pricing coming soon</p><h1>Clear product scope. No invented <em>offers.</em></h1><p>The subscription foundation is part of the MVP, but public plans, prices, billing terms, and checkout are still to be approved.</p></div></section>
      <section className="pricing-section"><div className="container"><PricingTable /></div></section>
      <section className="section section--cream"><div className="container comparison"><div><p className="eyebrow">At a glance</p><h2>What is approved today.</h2></div><div className="comparison__rows"><div><span>Current MVP capabilities</span><b>Available product scope</b></div><div><span>Subscription foundation</span><b>Current MVP</b></div><div><span>Plans, prices, and checkout</span><b>Coming Soon</b></div><div><span>Expansion features</span><b>Future Expansion</b></div></div></div></section>
      <section className="section"><div className="container faq-layout"><div><p className="eyebrow">Questions, answered</p><h2>Before pricing launches.</h2><p>Complete offers and billing terms will be published only after they are approved.</p></div><div className="faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></div></section>
      <div className="container section section--topless"><CtaBand /></div>
    </main>
  );
}
