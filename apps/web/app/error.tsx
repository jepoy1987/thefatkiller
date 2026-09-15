'use client';

import Link from 'next/link';
export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto max-w-xl px-6 py-16"><h1 className="text-2xl font-bold">This page could not be loaded</h1><p role="alert" className="my-4">Try loading the page again. If you just saved a change, check its status before submitting again.</p><div className="flex gap-4"><button onClick={reset} className="rounded-lg border px-4 py-2 font-semibold focus-visible:ring-4">Try again</button><Link href="/dashboard" className="rounded-lg border px-4 py-2 focus-visible:ring-4">Back to Today</Link></div></main>;
}
