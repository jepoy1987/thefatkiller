import Link from 'next/link';
import { ArrowUpRight } from './icons';

const groups = [
  { title: 'Explore', links: [['Features', '/features'], ['Pricing', '/pricing'], ['Journal', '/blog'], ['Help center', '/help']] },
  { title: 'Company', links: [['About', '/about'], ['Contact', '/contact'], ['Privacy', '/privacy'], ['Terms', '/terms']] },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-lead">
          <Link className="brand brand--footer" href="/" aria-label="The Fat Killer home">
            <span className="brand__mark">TFK</span>
            <span className="brand__name">The Fat Killer</span>
          </Link>
          <p>Know what to do today, track progress, and understand what is working.</p>
          <a className="footer-email" href="mailto:support@thefatkiller.com">support@thefatkiller.com <ArrowUpRight /></a>
        </div>
        {groups.map((group) => (
          <div className="footer-links" key={group.title}>
            <p>{group.title}</p>
            {group.links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
          </div>
        ))}
        <div className="footer-cta">
          <p className="eyebrow">Ready for today?</p>
          <h2>Make your next step an obvious one.</h2>
          <a className="button button--cream" href="https://app.thefatkiller.com">Open TFK App <ArrowUpRight /></a>
        </div>
      </div>
      <div className="container footer-bottom">
        <p>© {new Date().getFullYear()} The Fat Killer. All rights reserved.</p>
        <p>Built for steady progress, not perfect days.</p>
      </div>
    </footer>
  );
}
