'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type NavItem = { href: string; label: string; adminOnly?: boolean };
type Section = { title: string; adminOnly?: boolean; items: NavItem[] };

const SECTIONS: Section[] = [
  {
    title: 'Recruiting',
    items: [
      { href: '/recruiting', label: 'Recruiting Pipeline', adminOnly: true },
      { href: '/recruiting/candidates', label: 'Candidates' },
      { href: '/recruiting/roles', label: 'Roles' },
      { href: '/recruiting/feedback', label: 'Interview Feedback' },
    ],
  },
  {
    title: 'Onboarding',
    adminOnly: true,
    items: [
      { href: '/onboarding', label: 'Onboarding' },
      { href: '/onboarding/tickets', label: 'Onboarding Tickets' },
    ],
  },
  {
    title: 'Team',
    items: [
      { href: '/team', label: 'Team Directory' },
      { href: '/referrals', label: 'Referrals' },
    ],
  },
];

export default function HomePage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setIsAdmin(d?.success ? !!d.data.isAdmin : false))
      .catch(() => setIsAdmin(false));
  }, []);

  if (isAdmin === null) return null;

  const visibleSections = SECTIONS
    .filter((s) => !s.adminOnly || isAdmin)
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.adminOnly || isAdmin) }))
    .filter((s) => s.items.length > 0);

  return (
    <div className="px-5 py-8 max-w-5xl">
      <h1 className="text-2xl font-black uppercase tracking-[0.15em] mb-8">Crew</h1>
      <div className="space-y-8">
        {visibleSections.map((section) => (
          <section key={section.title}>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-3 border-b border-[var(--border-light)] pb-2">
              {section.title}
            </h2>
            <nav className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block border-2 border-[var(--border)] bg-[var(--card-background)] p-4 font-mono text-sm uppercase tracking-wider hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </section>
        ))}
      </div>
    </div>
  );
}
