// src/components/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tags,
  Users,
  ShieldCheck,
  Image as ImageIcon,
} from 'lucide-react';

// Each nav item declares which permission is needed to see it.
// requiredPermission = null means everyone logged in can see it.
const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, requiredPermission: 'dashboard:watch' },
  { label: 'Products', href: '/products', icon: Package, requiredPermission: 'product:read' },
  { label: 'Categories', href: '/categories', icon: FolderTree, requiredPermission: 'category:read' },
  { label: 'Brands', href: '/brands', icon: Tags, requiredPermission: 'brand:read' },
  { label: 'Media', href: '/media', icon: ImageIcon, requiredPermission: 'media:read' },
  { label: 'Users', href: '/users', icon: Users, requiredPermission: 'user:read' },
  { label: 'Roles', href: '/roles', icon: ShieldCheck, requiredPermission: 'role:read' },
];

export function Sidebar() {
  const { hasPermission } = useAuth();
  const pathname = usePathname();

  // Filter out any nav item the current user doesn't have permission for
  const visibleItems = NAV_ITEMS.filter((item) => hasPermission(item.requiredPermission));

  return (
    <aside className="w-64 h-screen bg-slate-900 text-slate-100 flex flex-col">
      <div className="px-6 py-5 text-lg font-semibold border-b border-slate-800">
        Admin Dashboard
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}

        {visibleItems.length === 0 && (
          <p className="px-3 text-sm text-slate-500">No accessible sections</p>
        )}
      </nav>
    </aside>
  );
}