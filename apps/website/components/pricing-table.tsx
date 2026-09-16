import Link from 'next/link';
import { ArrowUpRight, Check } from './icons';

export function PricingTable() {
  return (
    <div>
      <p className="draft-price-note" role="note"><strong>Pricing coming soon</strong> · Public plans, prices, billing terms, and checkout are not finalized or live.</p>
      <div className="pricing-grid">
        <article className="price-card price-card--popular">
          <p className="popular-label">Current MVP</p>
          <div className="price-card__top"><h2>TFK App</h2><p>Open the current product experience and use the available MVP tools.</p></div>
          <a className="button button--full" href="https://app.thefatkiller.com">Open TFK App <ArrowUpRight /></a>
          <div className="price-card__features"><p>Current product scope</p><ul>{['Today Dashboard', 'Weight and progress tracking', 'Nutrition, water, and habits', 'Daily and weekly check-ins', 'TFK Score'].map((feature) => <li key={feature}><Check /> {feature}</li>)}</ul></div>
        </article>
        <article className="price-card">
          <p className="popular-label">Coming Soon</p>
          <div className="price-card__top"><h2>Pricing details</h2><p>TFK includes a subscription foundation, but no public plan structure or price is approved here.</p></div>
          <Link className="button button--full button--outline" href="/contact">Contact TFK <ArrowUpRight /></Link>
          <div className="price-card__features"><p>Still to be confirmed</p><ul>{['Plan names and tiers', 'Monthly or annual prices', 'Billing and cancellation terms', 'Checkout availability'].map((item) => <li key={item}><Check /> {item}</li>)}</ul></div>
        </article>
        <article className="price-card">
          <p className="popular-label">Future Expansion</p>
          <div className="price-card__top"><h2>Roadmap features</h2><p>GLP-1 journaling, coaching, workouts, and AI insights are planned separately from the current MVP.</p></div>
          <Link className="button button--full button--outline" href="/features">Explore Features</Link>
          <div className="price-card__features"><p>Not currently available</p><ul>{['GLP-1 journal', 'Coaching platform', 'Workout and training system', 'AI-powered weekly insights'].map((feature) => <li key={feature}><Check /> {feature}</li>)}</ul></div>
        </article>
      </div>
    </div>
  );
}
