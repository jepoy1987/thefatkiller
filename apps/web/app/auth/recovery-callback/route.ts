import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getAppOrigin } from '../../../lib/origin';

const RECOVERY_ERROR = '/forgot-password?error=Recovery%20link%20is%20invalid%20or%20expired.';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const appUrl = getAppOrigin(requestUrl.origin);
  const code = requestUrl.searchParams.get('code');

  if (!code) return NextResponse.redirect(new URL(RECOVERY_ERROR, appUrl));

  const response = NextResponse.redirect(new URL('/reset-password', appUrl));
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
  if (error) return NextResponse.redirect(new URL(RECOVERY_ERROR, appUrl));

  response.cookies.set('tfk_recovery', '1', {
    httpOnly: true,
    maxAge: 600,
    path: '/',
    sameSite: 'lax',
    secure: appUrl.startsWith('https://'),
  });

  return response;
}
