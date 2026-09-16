'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Close, Menu } from './icons';

const navItems = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Journal' },
  { href: '/help', label: 'Help' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand" href="/" aria-label="The Fat Killer home">
          <span className="brand__mark">TFK</span>
          <span className="brand__name">The Fat Killer</span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link className={pathname === item.href ? 'is-active' : ''} href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <Link className="text-link" href="/features">Explore Features</Link>
          <a className="button button--small" href="https://app.thefatkiller.com">
            Open TFK App <ArrowUpRight />
          </a>
        </div>

        <button
          className="menu-button"
          type="button"
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <Close /> : <Menu />}
        </button>
      </div>

      <div className={`mobile-menu${open ? ' is-open' : ''}`} id="mobile-navigation">
        <nav aria-label="Mobile navigation">
          {navItems.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
          <Link href="/about">About</Link>
        </nav>
        <div className="mobile-menu__actions">
          <Link className="button button--outline" href="/features">Explore Features</Link>
          <a className="button" href="https://app.thefatkiller.com">Open TFK App <ArrowUpRight /></a>
        </div>
      </div>
    </header>
  );
}
