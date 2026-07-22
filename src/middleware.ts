import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const path = req.nextUrl.pathname;
    const email = (req.nextauth.token?.email as string | undefined)?.toLowerCase();

    const adminEmails = (process.env.RECRUITING_EMAILS || '')
      .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

    const isAdmin = adminEmails.length > 0 && !!email && adminEmails.includes(email);

    // Paths open to all authenticated users (exempt from admin restriction)
    const openPaths = ['/recruiting/feedback', '/api/recruiting/feedback', '/recruiting/roles', '/api/recruiting/roles', '/recruiting/candidates', '/api/recruiting/candidates/interview'];
    const isOpenPath = openPaths.some((p) => path.startsWith(p))
      || /^\/api\/recruiting\/candidates\/[^/]+\/resume$/.test(path);

    // Admin-only routes (recruiting pipeline + onboarding + FAQ admin + team tracker)
    const adminOnlyPaths = ['/recruiting', '/api/recruiting', '/onboarding', '/api/onboarding', '/faq/admin', '/api/faq/admin', '/team/tracker', '/api/team/tracker', '/team/alumni', '/team/planning', '/api/team/planning'];
    if (!isOpenPath && adminOnlyPaths.some((p) => path.startsWith(p))) {
      if (!isAdmin) {
        return NextResponse.rewrite(new URL('/auth/error?error=AccessDenied', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: '/auth/signin',
    },
  }
);

/**
 * Protect all routes except:
 * - NextAuth routes (sign in, callback, etc.)
 * - Auth pages (custom sign-in, error)
 * - Next.js internals and static assets
 * - Public assets
 */
export const config = {
  matcher: [
    '/((?!api/auth|api/cron|auth/signin|auth/error|_next/static|_next/image|fonts/|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.ico$|.*\\.docx$|.*\\.otf$|.*\\.ttf$|.*\\.woff$|.*\\.woff2$).*)',
  ],
};
