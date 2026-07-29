// src/app/dashboard/page.tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ProtectedLayout } from '@/components/ProtectedLayout';

// Quick links shown only if the user actually has permission for that section —
// reuses the same permission list the Sidebar filters against.
const QUICK_LINKS = [
  { label: 'Products', href: '/products', requiredPermission: 'product:read' },
  { label: 'Categories', href: '/categories', requiredPermission: 'category:read' },
  { label: 'Brands', href: '/brands', requiredPermission: 'brand:read' },
  { label: 'Media Library', href: '/media', requiredPermission: 'media:read' },
  { label: 'Users', href: '/users', requiredPermission: 'user:read' },
  { label: 'Roles', href: '/roles', requiredPermission: 'role:read' },
];

export default function DashboardPage() {
  const { user, logout, hasPermission } = useAuth();

  const visibleLinks = QUICK_LINKS.filter((link) => hasPermission(link.requiredPermission));

  return (
    <ProtectedLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Welcome back, {user?.name}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {user?.role.name} · {user?.email}
            </p>
          </div>
          <button
            onClick={logout}
            className="text-sm text-slate-500 hover:text-slate-700 hover:underline"
          >
            Log out
          </button>
        </div>

        {/* ---- Session summary card ---- */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Signed in as</p>
              <p className="text-sm font-medium text-slate-800 mt-1">{user?.email}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Role</p>
              <span className="inline-block bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-md mt-1 font-medium">
                {user?.role.name}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Permissions</p>
              <p className="text-sm font-medium text-slate-800 mt-1">
                {user?.permissions.length ?? 0} granted
              </p>
            </div>
          </div>
        </div>

        {/* ---- Quick access, filtered by permission ---- */}
        <div>
          <h2 className="text-sm font-medium text-slate-700 mb-3">Quick Access</h2>

          {visibleLinks.length === 0 ? (
            <p className="text-sm text-slate-400">
              No sections are available for your current role.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {visibleLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}