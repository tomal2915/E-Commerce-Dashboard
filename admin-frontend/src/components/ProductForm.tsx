// src/components/ProductForm.tsx
'use client';

import { useState } from 'react';
import { api } from '@/lib/axios';
import { MediaPicker } from './MediaPicker';

interface Variant {
  sku: string;
  price: string;
  salePrice: string;
  stock: number;
  attributeValueIds: string[];
}

interface SelectedMedia {
  id: string;
  publicUrl: string;
  isThumbnail: boolean;
}

export function ProductForm() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hasVariants, setHasVariants] = useState(false);

  // Simple product fields
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [stock, setStock] = useState(0);
  const [sku, setSku] = useState('');

  // Variable product fields
  const [variants, setVariants] = useState<Variant[]>([
    { sku: '', price: '', salePrice: '', stock: 0, attributeValueIds: [] },
  ]);

  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function addVariantRow() {
    setVariants((prev) => [
      ...prev,
      { sku: '', price: '', salePrice: '', stock: 0, attributeValueIds: [] },
    ]);
  }

  function removeVariantRow(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function updateVariant(index: number, field: keyof Variant, value: any) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    );
  }

  // Only one image can be the thumbnail — selecting a new one unsets the old one
  function setThumbnail(mediaId: string) {
    setSelectedMedia((prev) =>
      prev.map((m) => ({ ...m, isThumbnail: m.id === mediaId })),
    );
  }

  function removeMedia(mediaId: string) {
    setSelectedMedia((prev) => prev.filter((m) => m.id !== mediaId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      await api.post('/products', {
        name,
        description,
        hasVariants,
        categoryIds: [], // wire up a category picker separately
        media: selectedMedia.map((m, index) => ({
          mediaId: m.id,
          isThumbnail: m.isThumbnail,
          sortOrder: index,
        })),
        ...(hasVariants
          ? { variants }
          : { price, salePrice: salePrice || undefined, stock, sku }),
      });

      // success — redirect or reset form as needed
    } catch (err: any) {
      // Backend sends a clear message for 400/409 (e.g. duplicate SKU, bad sale price)
      setError(err.response?.data?.message ?? 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      {/* ---- Simple / Variable toggle ---- */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Product Type</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setHasVariants(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${
              !hasVariants
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            Simple Product
          </button>
          <button
            type="button"
            onClick={() => setHasVariants(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${
              hasVariants
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            Variable Product
          </button>
        </div>
      </div>

      {/* ---- Simple product fields ---- */}
      {!hasVariants && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              min={0}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Price</label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Sale Price (optional)
            </label>
            <input
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {/* ---- Variable product: variant rows ---- */}
      {hasVariants && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">Variants</label>

          {variants.map((variant, index) => (
            <div
              key={index}
              className="grid grid-cols-5 gap-2 items-end border border-slate-200 rounded-lg p-3"
            >
              <div>
                <label className="block text-xs text-slate-500 mb-1">SKU</label>
                <input
                  value={variant.sku}
                  onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Price</label>
                <input
                  value={variant.price}
                  onChange={(e) => updateVariant(index, 'price', e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Sale Price</label>
                <input
                  value={variant.salePrice}
                  onChange={(e) => updateVariant(index, 'salePrice', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Stock</label>
                <input
                  type="number"
                  value={variant.stock}
                  onChange={(e) => updateVariant(index, 'stock', Number(e.target.value))}
                  min={0}
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => removeVariantRow(index)}
                disabled={variants.length === 1}
                className="text-sm text-red-600 hover:underline disabled:text-slate-300 disabled:no-underline pb-2"
              >
                Remove
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addVariantRow}
            className="text-sm font-medium text-slate-700 hover:underline"
          >
            + Add another variant
          </button>
        </div>
      )}

      {/* ---- Media picker ---- */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Product Images</label>

        <div className="flex flex-wrap gap-3 mb-3">
          {selectedMedia.map((m) => (
            <div key={m.id} className="relative w-24 h-24 border border-slate-200 rounded-lg overflow-hidden group">
              <img src={m.publicUrl} alt="" className="w-full h-full object-cover" />
              {m.isThumbnail && (
                <span className="absolute top-1 left-1 bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded">
                  Thumbnail
                </span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                {!m.isThumbnail && (
                  <button
                    type="button"
                    onClick={() => setThumbnail(m.id)}
                    className="text-white text-[10px] underline"
                  >
                    Set as thumbnail
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(m.id)}
                  className="text-white text-[10px] underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 text-sm hover:border-slate-400 hover:text-slate-500"
          >
            + Add
          </button>
        </div>

        {isPickerOpen && (
          <MediaPicker
            onSelect={(media) => {
              setSelectedMedia((prev) => [
                ...prev,
                { id: media.id, publicUrl: media.publicUrl, isThumbnail: prev.length === 0 },
              ]);
              setIsPickerOpen(false);
            }}
            onClose={() => setIsPickerOpen(false)}
          />
        )}
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Save Product'}
      </button>
    </form>
  );
}