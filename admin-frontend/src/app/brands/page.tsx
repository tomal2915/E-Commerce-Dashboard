// src/app/brands/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { useToast } from '@/components/ToastProvider';
import { getErrorMessage } from '@/lib/apiError';
import { LoadingState, EmptyState, ErrorState } from '@/components/DataState';
import { Sidebar } from '@/components/Sidebar';
import { MediaPicker } from '@/components/MediaPicker';

interface Brand {
  id: string;
  name: string;
  status: boolean;
  logoId: string | null;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [error, setError] = useState('');
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { showToast } = useToast();

  async function loadBrands() {
    setError('');
    setBrands(null);
    try {
      const res = await api.get('/brands');
      setBrands(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadBrands();
  }, []);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-8 bg-slate-50 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Brands</h1>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            + New Brand
          </button>
        </div>

        {brands === null && !error && <LoadingState label="Loading brands..." />}
        {error && <ErrorState message={error} onRetry={loadBrands} />}
        {brands && brands.length === 0 && <EmptyState label="No brands yet" />}

        {brands && brands.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {brands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => setEditingBrand(brand)}
                className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-slate-300"
              >
                <p className="font-medium text-slate-800">{brand.name}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-md mt-1 inline-block ${
                    brand.status ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {brand.status ? 'Active' : 'Inactive'}
                </span>
              </button>
            ))}
          </div>
        )}

        {(isCreating || editingBrand) && (
          <BrandFormModal
            brand={editingBrand}
            onClose={() => {
              setIsCreating(false);
              setEditingBrand(null);
            }}
            onSaved={() => {
              setIsCreating(false);
              setEditingBrand(null);
              loadBrands();
            }}
          />
        )}
      </main>
    </div>
  );
}

function BrandFormModal({
  brand,
  onClose,
  onSaved,
}: {
  brand: Brand | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!brand;
  const { showToast } = useToast();
  const [name, setName] = useState(brand?.name ?? '');
  const [description, setDescription] = useState('');
  const [logoId, setLogoId] = useState(brand?.logoId ?? '');
  const [logoPreview, setLogoPreview] = useState('');
  const [status, setStatus] = useState(brand?.status ?? true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      const payload = { name, description: description || undefined, logoId: logoId || undefined, status };
      if (isEditing) {
        await api.put(`/brands/${brand!.id}`, payload);
      } else {
        await api.post('/brands', payload);
      }
      showToast(isEditing ? 'Brand updated' : 'Brand created', 'success');
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">{isEditing ? 'Edit Brand' : 'New Brand'}</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
            {error}
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
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Logo</label>
          {logoPreview && <img src={logoPreview} className="w-16 h-16 object-cover rounded-lg mb-2" />}
          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="text-sm text-slate-600 border border-dashed border-slate-300 rounded-lg px-3 py-2 hover:border-slate-400"
          >
            {logoId ? 'Change Logo' : 'Pick Logo'}
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={status}
            onChange={(e) => setStatus(e.target.checked)}
            className="w-4 h-4 accent-slate-900"
          />
          Active
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {isPickerOpen && (
          <MediaPicker
            onSelect={(media) => {
              setLogoId(media.id);
              setLogoPreview(media.publicUrl);
              setIsPickerOpen(false);
            }}
            onClose={() => setIsPickerOpen(false)}
          />
        )}
      </form>
    </div>
  );
}