// src/app/permissions/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { useToast } from '@/components/ToastProvider';
import { getErrorMessage } from '@/lib/apiError';
import { LoadingState, EmptyState, ErrorState } from '@/components/DataState';
import { Sidebar } from '@/components/layout/Sidebar';

interface Permission {
  id: string;
  name: string;
}
interface PermissionGroup {
  id: string;
  name: string;
  description: string | null;
  permissions: Permission[];
}

const ALL_ACTIONS = ['create', 'read', 'update', 'delete', 'watch'];

export default function PermissionsPage() {
  const [groups, setGroups] = useState<PermissionGroup[] | null>(null);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  async function loadGroups() {
    setError('');
    setGroups(null);
    try {
      const res = await api.get('/permissions/groups');
      setGroups(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadGroups();
  }, []);

  function toggleAction(action: string) {
    setSelectedActions((prev) => {
      const next = new Set(prev);
      next.has(action) ? next.delete(action) : next.add(action);
      return next;
    });
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.post('/permissions/groups', {
        name,
        description,
        actions: Array.from(selectedActions),
      });
      showToast('Permission group created', 'success');
      setName('');
      setDescription('');
      setSelectedActions(new Set());
      setIsCreating(false);
      loadGroups();
    } catch (err) {
      showToast(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-8 bg-slate-50 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Permissions</h1>
          <button
            onClick={() => setIsCreating((v) => !v)}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            {isCreating ? 'Cancel' : '+ New Group'}
          </button>
        </div>

        {isCreating && (
          <form
            onSubmit={handleCreateGroup}
            className="bg-white border border-slate-200 rounded-xl p-5 mb-6 space-y-4 max-w-lg"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Module Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. shipment"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Actions</label>
              <div className="flex flex-wrap gap-3">
                {ALL_ACTIONS.map((action) => (
                  <label key={action} className="flex items-center gap-2 text-sm capitalize">
                    <input
                      type="checkbox"
                      checked={selectedActions.has(action)}
                      onChange={() => toggleAction(action)}
                      className="w-4 h-4 accent-slate-900"
                    />
                    {action}
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={isSaving || selectedActions.size === 0}
              className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Create Group'}
            </button>
          </form>
        )}

        {groups === null && !error && <LoadingState label="Loading permissions..." />}
        {error && <ErrorState message={error} onRetry={loadGroups} />}
        {groups && groups.length === 0 && <EmptyState label="No permission groups yet" />}

        {groups && groups.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Module</th>
                  <th className="text-left px-4 py-2 font-medium">Permissions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium capitalize text-slate-800 align-top">
                      {group.name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {group.permissions.map((p) => (
                          <span
                            key={p.id}
                            className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-md"
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}