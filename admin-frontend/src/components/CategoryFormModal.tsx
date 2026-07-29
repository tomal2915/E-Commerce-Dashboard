// src/components/CategoryFormModal.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { useToast } from '@/components/ToastProvider';
import { getErrorMessage } from '@/lib/apiError';
import { MediaPicker } from './MediaPicker';

interface CategoryOption {
  id: string;
  name: string;
}
interface CategoryData {
  id: string;
  name: string;
  activeFlag: boolean;
  sortOrder: number;
}

export function CategoryFormModal({
  category,
  onClose,
  onSaved,
}: {
  category: CategoryData | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!category;
  const { showToast } = useToast();

  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [imageId, setImageId] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [activeFlag, setActiveFlag] = useState(category?.activeFlag ?? true);
  const [sortOrder, setSortOrder] = useState(category?.sortOrder ?? 0);
  const [allCategories, setAllCategories] = useState<CategoryOption[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.get('/categories').then((res) => setAllCategories(res.data.data));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      const payload = {
        name,
        description: description || undefined,
        parentId: parentId || undefined,
        imageId: imageId || undefined,
        activeFlag,
        sortOrder,
      };

      if (isEditing) {
        await api.put(`/categories/${category!.id}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      showToast(isEditing ? 'Category updated' : 'Category created', 'success');
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
        <h2 className="font-semibold text-slate-900">
          {isEditing ? 'Edit Category' : 'New Category'}
        </h2>

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
          <label className="block text-sm font-medium text-slate-700 mb-1">Parent Category</label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">None (top-level)</option>
            {allCategories
              .filter((c) => c.id !== category?.id) // can't be its own parent
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Image</label>
          {imagePreview && (
            <img src={imagePreview} className="w-20 h-20 object-cover rounded-lg mb-2" />
          )}
          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="text-sm text-slate-600 border border-dashed border-slate-300 rounded-lg px-3 py-2 hover:border-slate-400"
          >
            {imageId ? 'Change Image' : 'Pick Image'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={activeFlag}
                onChange={(e) => setActiveFlag(e.target.checked)}
                className="w-4 h-4 accent-slate-900"
              />
              Active
            </label>
          </div>
        </div>

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
              setImageId(media.id);
              setImagePreview(media.publicUrl);
              setIsPickerOpen(false);
            }}
            onClose={() => setIsPickerOpen(false)}
          />
        )}
      </form>
    </div>
  );
}