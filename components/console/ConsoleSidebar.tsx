'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  {
    label: 'Dashboard',
    href: '/',
    enabled: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Agents',
    href: '/agents',
    enabled: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
        <circle cx="19" cy="6" r="2" />
        <path d="M22 10c2-1 3-3 3-5" />
      </svg>
    ),
  },
  {
    label: 'Bots',
    href: '/bots',
    enabled: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <rect x="3" y="8" width="18" height="12" rx="2" />
        <circle cx="8" cy="14" r="2" />
        <circle cx="16" cy="14" r="2" />
        <path d="M12 2v4" />
        <circle cx="12" cy="2" r="1" />
      </svg>
    ),
  },
  {
    label: 'Logs',
    href: '/logs',
    enabled: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h8" />
        <path d="M8 9h2" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/settings',
    enabled: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
];

export function ConsoleSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const prefetched = navItems
      .filter((item) => item.enabled && item.href !== pathname)
      .map((item) => item.href);

    prefetched.forEach((href) => {
      router.prefetch(href);
    });
  }, [pathname, router]);

  return (
    <aside className="glass-panel flex w-[144px] flex-col rounded-[16px] border-white/8 bg-[linear-gradient(180deg,rgba(120,53,180,0.24)_0%,rgba(33,39,70,0.9)_100%)] px-3 py-2">
      <div className="mb-4 flex items-center gap-3 px-2 py-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#f472b6_0%,#8b5cf6_100%)] shadow-[0_0_22px_rgba(244,114,182,0.28)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-white">
            <path d="M4 12h4l2-5 4 10 2-5h4" />
          </svg>
        </div>
        <div className="text-sm font-semibold text-white">ClawLab</div>
      </div>

      <nav className="flex-1 py-2">
        <ul className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            const baseClassName = `
              flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] transition-all duration-200
              ${isActive
                ? 'bg-white/10 text-white shadow-[0_4px_16px_rgba(0,0,0,0.18)]'
                : 'text-white/55 hover:bg-white/6 hover:text-white/82'
              }
            `;
            const disabledClassName = 'cursor-not-allowed text-white/28 opacity-60 hover:bg-transparent hover:text-white/28';

            return (
              <li key={item.href}>
                {item.enabled ? (
                  <Link href={item.href} prefetch className={baseClassName}>
                    <span className={isActive ? 'text-pink-300' : 'text-white/35'}>{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                    {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-pink-400" />}
                  </Link>
                ) : (
                  <div
                    aria-disabled="true"
                    className={`${baseClassName} ${disabledClassName}`}
                    title={`${item.label} is not available yet`}
                  >
                    <span className="text-white/20">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                    <span className="ml-auto rounded-full border border-white/8 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-white/30">
                      Soon
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-2 pt-2">
        <button className="flex items-center gap-2 text-[12px] text-white/45 transition-colors hover:text-white/75">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <path d="M10 17l-5-5 5-5" />
            <path d="M19 17l-5-5 5-5" opacity="0.35" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}
