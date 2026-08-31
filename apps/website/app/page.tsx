export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <nav className="mb-16 flex items-center justify-between">
        <div className="text-2xl font-bold">TFK</div>
        <div className="flex gap-6 text-sm text-slate-700">
          <a href="/features">Features</a>
          <a href="/pricing">Pricing</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
        </div>
        <div className="flex gap-3">
          <a className="rounded border px-4 py-2" href="http://localhost:3001/login">Login</a>
          <a className="rounded bg-slate-900 px-4 py-2 text-white" href="http://localhost:3001/signup">Get started</a>
        </div>
      </nav>

      <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">The Fat Killer</p>
          <h1 className="text-5xl font-black leading-tight">Simple tools. Real accountability.</h1>
          <p className="mt-6 max-w-xl text-lg text-slate-600">
            Build healthy routines, stay consistent, and keep your progress in one place.
          </p>
          <div className="mt-8 flex gap-4">
            <a className="rounded bg-slate-900 px-6 py-3 text-white" href="http://localhost:3001/signup">Join now</a>
            <a className="rounded border px-6 py-3" href="/features">See features</a>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-4">
            <div className="rounded-xl bg-slate-100 p-4">Consistency score</div>
            <div className="rounded-xl bg-slate-100 p-4">Weekly check-in</div>
            <div className="rounded-xl bg-slate-100 p-4">Shared accountability</div>
          </div>
        </div>
      </section>
    </main>
  );
}
