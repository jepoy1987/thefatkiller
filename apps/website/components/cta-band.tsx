import { ArrowUpRight } from './icons';
import Link from 'next/link';

export function CtaBand() {
  return (
    <section className="cta-band" aria-labelledby="cta-title">
      <div>
        <p className="eyebrow eyebrow--light">One plan. One day at a time.</p>
        <h2 id="cta-title">Clarity is a powerful habit.</h2>
      </div>
      <div className="cta-band__actions">
        <a className="button button--cream" href="https://app.thefatkiller.com">Open TFK App <ArrowUpRight /></a>
        <Link className="button button--dark-outline" href="/features">Explore Features</Link>
      </div>
    </section>
  );
}
