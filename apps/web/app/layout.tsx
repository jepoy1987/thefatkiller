import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'TFK App', description: 'The Fat Killer app' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
