// src/app/attributes/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { useToast } from '@/components/ToastProvider';
import { getErrorMessage } from '@/lib/apiError';
import { LoadingState, EmptyState, ErrorState } from '@/components/DataState';
import { Sidebar } from '@/components/Sidebar';

interface AttributeValue {
  id: string;
  value: string;
}
interface Attribute {
  id: string;
  name: string;
  type: 'text' | 'color' | 'number';
  values: AttributeValue[];
}

export default function AttributesPage() {
  const [attributes, setAttributes] = useState<Attribute[] | null>(null);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'text' | 'color' | 'number'>('text');
  const [newValueDraft, setNewValueDraft] = useState<Record<string, string>>({});
  const { showToast } = useToast();

  async function loadAttributes() {
    setError('');
    setAttributes(null);
    try {
      const res = await api.get('/attributes');
      setAttributes(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadAttributes();
  }, []);

  async function handleCreateAttribute(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/attributes', { name: newName, type: newType });
      showToast('Attribute created', 'success');
      setNewName('');
      setIsCreating(false);
      loadAttributes();
    } catch (err) {
      showToast(getErrorMessage(err));
    }
  }

  async function handleAddValue(attributeId: string) {
    const value = newValueDraft[attributeId]?.trim();
    if (!value) return;
    try {
      await api.post(`/attributes/${attributeId}/values`, { value });
      setNewValueDraft((prev) => ({ ...prev, [attributeId]: '' }));
      loadAttributes();
    } catch (err) {
      showToast(getErrorMessage(err));
    }
  }

  async function handleRemoveValue(valueId: string) {
    try {
      await api.delete(`/attributes/values/${valueId}`);
      loadAttributes();
    } catch (err) {
      showToast(getErrorMessage(err));
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-8 bg-slate-50 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Attributes</h1>
          <button
            onClick={() => setIsCreating((v) => !v)}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            {isCreating ? 'Cancel' : '+ New Attribute'}
          </button>
        </div>

        {isCreating && (
          <form
            onSubmit={handleCreateAttribute}
            className="bg-white border border-slate-200 rounded-xl p-5 mb-6 flex gap-3 items-end max-w-lg"
          >
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="e.g. Color"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="text">Text</option>
                <option value="color">Color</option>
                <option value="number">Number</option>
              </select>
            </div>
            <button
              type="submit"
              className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
            >
              Create
            </button>
          </form>
        )}

        {attributes === null && !error && <LoadingState label="Loading attributes..." />}
        {error && <ErrorState message={error} onRetry={loadAttributes} />}
        {attributes && attributes.length === 0 && <EmptyState label="No attributes yet" />}

        {attributes && attributes.length > 0 && (
          <div className="space-y-4">
            {attributes.map((attr) => (
              <div key={attr.id} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-slate-800">{attr.name}</h3>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md capitalize">
                    {attr.type}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {attr.values.map((val) => (
                    <span
                      key={val.id}
                      className="flex items-center gap-2 bg-slate-100 text-slate-700 text-sm px-2.5 py-1 rounded-md"
                    >
                      {attr.type === 'color' && (
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-slate-300"
                          style={{ backgroundColor: val.value }}
                        />
                      )}
                      {val.value}
                      <button
                        onClick={() => handleRemoveValue(val.id)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 items-center">
                  {attr.type === 'color' ? (
                    <input
                      type="color"
                      value={newValueDraft[attr.id] || '#000000'}
                      onChange={(e) =>
                        setNewValueDraft((prev) => ({ ...prev, [attr.id]: e.target.value }))
                      }
                      className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer"
                    />
                  ) : (
                    <input
                      value={newValueDraft[attr.id] || ''}
                      onChange={(e) =>
                        setNewValueDraft((prev) => ({ ...prev, [attr.id]: e.target.value }))
                      }
                      placeholder="Add value (e.g. Red, XL)"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm w-48"
                    />
                  )}
                  <button
                    onClick={() => handleAddValue(attr.id)}
                    className="text-sm font-medium text-slate-700 hover:underline"
                  >
                    + Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}