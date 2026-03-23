'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    label: 'Dashboard',
    href: '/',
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

  return (
    <aside className="w-64 bg-bg-secondary border-r border-zinc-800 flex flex-col">
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded
                    transition-all duration-150
                    ${isActive
                      ? 'bg-amber-600/10 text-amber-500 border-l-2 border-amber-600'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border-l-2 border-transparent'
                    }
                  `}
                >
                  <span className={isActive ? 'text-amber-500' : 'text-zinc-500'}>{item.icon}</span>
                  <span className="text-sm font-medium uppercase tracking-wider">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <div className="hazard-stripe h-1 rounded mb-4 opacity-30" />
        <div className="text-xs text-zinc-600 uppercase tracking-wider">
          OpenClaw Gateway v1.0
        </div>
      </div>
    </aside>
  );
}
