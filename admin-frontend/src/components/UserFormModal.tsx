// src/components/UserFormModal.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ToastProvider';
import { parseFieldErrors, getErrorMessage } from '@/lib/apiError';
import { FieldError } from '@/components/FieldError';

interface Role {
  id: string;
  name: string;
}
interface UserData {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  role: { id: string; name: string };
}

export function UserFormModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserData | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const isEditing = !!user;
  const isEditingSelf = currentUser?.id === user?.id;

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState(user?.role.id ?? '');
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.get('/roles').then((res) => setRoles(res.data.data));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError('');
    setIsSaving(true);

    try {
      if (isEditing) {
        await api.put(`/users/${user!.id}`, { name, roleId, isActive });
      } else {
        await api.post('/users', { name, email, password, roleId });
      }
      showToast(isEditing ? 'User updated' : 'User created', 'success');
      onSaved();
    } catch (err: any) {
      const message = err.response?.data?.message;
      if (message) setFieldErrors(parseFieldErrors(message));
      setGeneralError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl w-full max-w-md p-6 space-y-4"
      >
        <h2 className="font-semibold text-slate-900">
          {isEditing ? 'Edit User' : 'New User'}
        </h2>

        {generalError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
            {generalError}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <FieldError message={fieldErrors.name} />
        </div>

        {!isEditing && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <FieldError message={fieldErrors.email} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <FieldError message={fieldErrors.password} />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            required
            disabled={isEditingSelf}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">Select a role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          {isEditingSelf && (
            <p className="text-xs text-slate-400 mt-1">
              You cannot change your own role.
            </p>
          )}
          <FieldError message={fieldErrors.roleId} />
        </div>

        {isEditing && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-slate-900"
            />
            Active
          </label>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}