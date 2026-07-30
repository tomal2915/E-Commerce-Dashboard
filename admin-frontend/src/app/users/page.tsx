// src/app/users/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { useToast } from '@/components/ToastProvider';
import { getErrorMessage } from '@/lib/apiError';
import { LoadingState, EmptyState, ErrorState } from '@/components/DataState';
import { Sidebar } from '@/components/layout/Sidebar';
import { UserFormModal } from '@/components/UserFormModal';

interface UserRow {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  role: { id: string; name: string };
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { showToast } = useToast();

  async function loadUsers() {
    setError('');
    setUsers(null);
    try {
      const res = await api.get('/users');
      setUsers(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleToggleActive(user: UserRow) {
    try {
      await api.put(`/users/${user.id}`, { isActive: !user.isActive });
      showToast(`User ${user.isActive ? 'deactivated' : 'activated'}`, 'success');
      loadUsers();
    } catch (err) {
      showToast(getErrorMessage(err));
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-8 bg-slate-50 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Users</h1>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            + New User
          </button>
        </div>

        {users === null && !error && <LoadingState label="Loading users..." />}
        {error && <ErrorState message={error} onRetry={loadUsers} />}
        {users && users.length === 0 && <EmptyState label="No users yet" />}

        {users && users.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-left px-4 py-2 font-medium">Email</th>
                  <th className="text-left px-4 py-2 font-medium">Role</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-right px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-800">{user.name}</td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-md">
                        {user.role.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`text-xs px-2 py-1 rounded-md font-medium ${
                          user.isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-sm text-slate-600 hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(isCreating || editingUser) && (
          <UserFormModal
            user={editingUser}
            onClose={() => {
              setIsCreating(false);
              setEditingUser(null);
            }}
            onSaved={() => {
              setIsCreating(false);
              setEditingUser(null);
              loadUsers();
            }}
          />
        )}
      </main>
    </div>
  );
}