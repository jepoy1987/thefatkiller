import Link from 'next/link';

const APP_URL = 'https://app.thefatkiller.com';
const DEMO_URL = 'https://demo.thefatkiller.com';

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/"><span>TFK</span><strong>The Fat Killer</strong></Link>
      <nav aria-label="Main navigation">
        <Link href="/features">Features</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/blog">Blog</Link>
        <Link href="/help">Help Articles</Link>
      </nav>
      <div className="header-actions">
        <a href={APP_URL}>Log in</a>
        <a className="button button-small" href={DEMO_URL}>View demo <span>↗</span></a>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand"><span>TFK</span><div><strong>The Fat Killer</strong><p>Know what to do today.</p></div></div>
      <div><strong>Explore</strong><Link href="/features">Features</Link><Link href="/pricing">Pricing</Link><Link href="/blog">Blog</Link><Link href="/help">Help</Link></div>
      <div><strong>Account</strong><a href={APP_URL}>Log in</a><a href={DEMO_URL}>View demo</a></div>
      <div><strong>Company</strong><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div>
      <small>© 2026 The Fat Killer. All rights reserved.</small>
    </footer>
  );
}

export function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <p className={`eyebrow${light ? ' eyebrow-light' : ''}`}><i />{children}</p>;
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return <><SiteHeader />{children}<SiteFooter /></>;
}

export { APP_URL, DEMO_URL };