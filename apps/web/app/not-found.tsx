import Link from 'next/link';
export default function NotFound() {
  return <main className="mx-auto max-w-xl px-6 py-16"><h1 className="text-2xl font-bold">Page not available</h1><p className="my-4">This page does not exist or is not available to your account.</p><Link href="/dashboard" className="underline focus-visible:ring-4">Back to Today</Link></main>;
}
