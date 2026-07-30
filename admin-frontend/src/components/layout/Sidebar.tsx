// src/components/layout/Sidebar.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { NAV_PERMISSIONS } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Package, FolderTree, Tags, Image as ImageIcon,
  Users, ShieldCheck, KeyRound, ChevronLeft, ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: NAV_PERMISSIONS.dashboard },
  { label: 'Products', href: '/products', icon: Package, permission: NAV_PERMISSIONS.products },
  { label: 'Categories', href: '/categories', icon: FolderTree, permission: NAV_PERMISSIONS.categories },
  { label: 'Brands', href: '/brands', icon: Tags, permission: NAV_PERMISSIONS.brands },
  { label: 'Attributes', href: '/attributes', icon: Tags, permission: NAV_PERMISSIONS.attributes },
  { label: 'Media Library', href: '/media', icon: ImageIcon, permission: NAV_PERMISSIONS.media },
  { label: 'Users', href: '/users', icon: Users, permission: NAV_PERMISSIONS.users },
  { label: 'Roles', href: '/roles', icon: ShieldCheck, permission: NAV_PERMISSIONS.roles },
  { label: 'Permissions', href: '/permissions', icon: KeyRound, permission: NAV_PERMISSIONS.permissions },
];

export function Sidebar() {
  const { hasPermission } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => hasPermission(item.permission));

  return (
    <aside
      className={cn(
        'h-screen bg-slate-900 text-slate-100 flex flex-col transition-all duration-200',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className="flex items-center justify-between px-4 py-5 border-b border-slate-800">
        {!collapsed && <span className="font-semibold text-sm">Admin Dashboard</span>}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-slate-400 hover:text-white"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white',
              )}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
        {visibleItems.length === 0 && !collapsed && (
          <p className="px-3 text-xs text-slate-500">No accessible sections</p>
        )}
      </nav>
    </aside>
  );
}