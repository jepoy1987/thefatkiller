import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getAppOrigin } from '../../../lib/origin';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const appUrl = getAppOrigin(requestUrl.origin);
  const code = requestUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login', appUrl));
  }

  const next = requestUrl.searchParams.get('next');
  const destination = next?.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
  const response = NextResponse.redirect(new URL(destination, appUrl));
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, appUrl));

  return response;
}
