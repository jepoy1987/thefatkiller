export function PageLoading() {
  return <main aria-busy="true" aria-label="Loading page" className="mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:pl-72">
    <p role="status" className="mb-6 text-sm font-semibold">Loading page…</p>
    <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
      <div className="h-10 max-w-md rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="h-28 rounded-xl border bg-card" />)}</div>
      <div className="h-64 rounded-xl border bg-card" />
    </div>
  </main>;
}
