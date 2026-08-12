'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getUser, clearAuth } from '@/lib/auth';
import { getRoleLabel, getRoleBadgeColor } from '@/lib/utils';
import { User, Role } from '@/types';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles: Role[];
}

const navItems: NavItem[] = [
  // Kassir
  { href: '/kassir', label: 'Сотув (POS)', icon: '🛒', roles: ['KASSIR'] },
  { href: '/kassir/tarix', label: 'Сотув тарихи', icon: '📋', roles: ['KASSIR'] },

  // Direktor
  { href: '/direktor', label: 'Дашборд', icon: '📈', roles: ['DIREKTOR'] },
  { href: '/direktor/mahsulotlar', label: 'Маҳсулотлар', icon: '📦', roles: ['DIREKTOR'] },
  { href: '/direktor/kategoriyalar', label: 'Категориялар', icon: '🏷️', roles: ['DIREKTOR'] },
  { href: '/direktor/savdo', label: 'Барча савдолар', icon: '💰', roles: ['DIREKTOR'] },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace('/login'); return; }
    setUser(u);
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  if (!user) return null;

  const userNavItems = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-dark-800',
        'border-r border-gray-100 dark:border-dark-700 flex flex-col',
        'transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100 dark:border-dark-700">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4a2482, #5c2fa0)' }}>
            <span className="text-white font-black text-lg">I</span>
          </div>
          <div>
            <h1 className="font-black text-gray-900 dark:text-white text-lg leading-none">MARKET</h1>
            <p className="text-xs text-gray-400 mt-0.5">Атир ва китоб дўкони</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
          {userNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn('sidebar-link', isActive && 'active')}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
                {isActive && <span className="ml-auto w-1.5 h-1.5 bg-primary-600 rounded-full" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-gray-100 dark:border-dark-700">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-dark-700">
            <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-primary-700 dark:text-primary-400 font-bold text-sm">
                {user.name[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{user.name}</p>
              <span className={cn('badge text-xs', getRoleBadgeColor(user.role))}>
                {getRoleLabel(user.role)}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 transition-colors p-1"
              title="Чиқиш"
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-dark-800 border-b border-gray-100 dark:border-dark-700">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700"
          >
            <MenuIcon />
          </button>
          <span className="font-black text-gray-900 dark:text-white">MARKET</span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
