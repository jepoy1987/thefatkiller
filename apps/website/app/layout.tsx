import type { Metadata } from 'next';
import { SiteFooter } from '../components/site-footer';
import { SiteHeader } from '../components/site-header';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://thefatkiller.com'),
  title: { default: 'The Fat Killer | Know what to do today', template: '%s | The Fat Killer' },
  description: 'Know what to do today, track your progress, and understand what is working with TFK.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
