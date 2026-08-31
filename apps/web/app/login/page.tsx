import Link from 'next/link';
import { login } from '../actions';

export default function LoginPage({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center p-6">
      <div className="w-full rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-3xl font-bold">Log in</h1>
        <p className="mt-2 text-sm text-slate-600">Welcome back to TFK.</p>
        {searchParams.error && <p className="mt-4 text-sm text-red-700">{searchParams.error}</p>}
        {searchParams.message && <p className="mt-4 text-sm text-green-700">{searchParams.message}</p>}
        <form action={login} className="mt-6 space-y-4">
          <input name="email" required type="email" className="w-full rounded border px-3 py-2" placeholder="Email" />
          <input name="password" required minLength={8} className="w-full rounded border px-3 py-2" type="password" placeholder="Password" />
          <button className="w-full rounded bg-slate-900 px-4 py-2 text-white" type="submit">Continue</button>
        </form>
        <div className="mt-4 flex items-center justify-between text-sm">
          <Link href="/forgot-password">Forgot password?</Link>
          <Link href="/signup">Create account</Link>
        </div>
      </div>
    </main>
  );
}
