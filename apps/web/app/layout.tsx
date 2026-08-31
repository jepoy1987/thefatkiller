import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'TFK — Your plan, made clear', description: 'A focused daily plan for sustainable weight management.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
