import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Fat Killer',
  description: 'Health and accountability for real life.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
