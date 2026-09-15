'use client';


/** One logical form submission keeps its key through a failed/lost response. */
export function newRequestKey() { return `${Date.now()}:${crypto.randomUUID()}`; }
export function RequestKey({ value }: { value: string }) {
  return <input type="hidden" name="request_key" value={value} />;
}
