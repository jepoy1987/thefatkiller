import './globals.css';
import type { Metadata } from 'next';
import { NavigationFeedback } from '../components/layout/navigation-feedback';

export const metadata: Metadata = { title: 'TFK — Your plan, made clear', description: 'A focused daily plan for sustainable weight management.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><NavigationFeedback>{children}</NavigationFeedback></body>
    </html>
  );
}
