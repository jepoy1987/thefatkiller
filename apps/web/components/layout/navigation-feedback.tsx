'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useTransition, type ComponentProps, type ReactNode } from 'react';

const NavigationContext = createContext<((href: string) => void) | null>(null);

/** Client state is local to this mounted tree; no user data is cached here. */
export function NavigationFeedback({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <NavigationContext.Provider value={(href) => startTransition(() => router.push(href))}>
    {pending && <div role="status" aria-live="polite" className="fixed inset-x-0 top-0 z-50 border-b bg-card px-4 py-2 text-center text-sm font-semibold shadow-sm">Loading page…</div>}
    {children}
  </NavigationContext.Provider>;
}

export function NavigationLink(props: ComponentProps<typeof Link>) {
  const navigate = useContext(NavigationContext);
  const pathname = usePathname();
  return <Link {...props} onClick={(event) => {
    props.onClick?.(event);
    // Preserve native new-tab, download, external and same-page behavior.
    if (!navigate || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === '_blank' || props.download || typeof props.href !== 'string' || !props.href.startsWith('/') || props.href.startsWith('//') || props.href === pathname) return;
    event.preventDefault();
    navigate(props.href);
  }} />;
}
