// app/products/[id]/page.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/axios';
import { getErrorMessage } from '@/lib/apiError';
import { useToast } from '@/components/ToastProvider';
import { useAuth } from '@/context/AuthContext';
import { ProtectedLayout } from '@/components/ProtectedLayout';
import { LoadingState, ErrorState } from '@/components/DataState';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface MediaItem {
  id: string;
  mediaId: string;
  isThumbnail: boolean;
  media?: { publicUrl: string; thumbnail: string | null };
}
interface VariantAttribute {
  attributeValue: { id: string; value: string; attribute: { name: string } };
}
interface Variant {
  id: string;
  sku: string;
  price: string;
  salePrice: string | null;
  stock: number;
  attributes: VariantAttribute[];
}
interface ProductDetail {
  id: string;
  name: string;
  description: string | null;
  status: boolean;
  hasVariants: boolean;
  price: string | null;
  salePrice: string | null;
  stock: number | null;
  sku: string | null;
  brand: { name: string } | null;
  categories: { category: { id: string; name: string } }[];
  media: MediaItem[];
  variants: Variant[];
  priceInfo: { minPrice: number; maxPrice: number };
}

export default function ProductPage({ params }: PageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  const [product, setProduct] = React.useState<ProductDetail | null>(null);
  const [error, setError] = React.useState('');
  const [activeImage, setActiveImage] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  async function loadProduct() {
    setError('');
    setProduct(null);
    try {
      const res = await api.get(`/products/${id}`);
      setProduct(res.data.data);
      const thumbnail = res.data.data.media.find((m: MediaItem) => m.isThumbnail);
      setActiveImage(thumbnail?.media?.publicUrl ?? res.data.data.media[0]?.media?.publicUrl ?? null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  React.useEffect(() => {
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDelete() {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await api.delete(`/products/${id}`);
      showToast('Product deleted', 'success');
      router.push('/products');
    } catch (err) {
      showToast(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <ProtectedLayout>
      <div className="p-8 max-w-5xl mx-auto">
        <Link href="/products" className="text-sm text-slate-500 hover:underline">
          ← Back to Products
        </Link>

        {product === null && !error && (
          <div className="mt-6">
            <LoadingState label="Loading product..." />
          </div>
        )}

        {error && (
          <div className="mt-6">
            <ErrorState message={error} onRetry={loadProduct} />
          </div>
        )}

        {product && (
          <div className="mt-4">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">{product.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                      product.status
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {product.status ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                    {product.hasVariants ? 'Variable Product' : 'Simple Product'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                {hasPermission('product:update') && (
                  <Link
                    href={`/products/add-new-products?edit=${product.id}`}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </Link>
                )}
                {hasPermission('product:delete') && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* ---- Image gallery ---- */}
              <div>
                <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden mb-3">
                  {activeImage ? (
                    <img src={activeImage} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-slate-400">
                      No image
                    </div>
                  )}
                </div>
                {product.media.length > 1 && (
                  <div className="flex gap-2">
                    {product.media.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setActiveImage(m.media?.publicUrl ?? null)}
                        className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${
                          activeImage === m.media?.publicUrl
                            ? 'border-slate-900'
                            : 'border-transparent'
                        }`}
                      >
                        <img
                          src={m.media?.thumbnail ?? m.media?.publicUrl}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ---- Details ---- */}
              <div className="space-y-5">
                <div>
                  <p className="text-2xl font-semibold text-slate-900">
                    {product.priceInfo.minPrice === product.priceInfo.maxPrice
                      ? `$${product.priceInfo.minPrice}`
                      : `$${product.priceInfo.minPrice} - $${product.priceInfo.maxPrice}`}
                  </p>
                  {!product.hasVariants && product.salePrice && (
                    <p className="text-sm text-slate-400 line-through">${product.price}</p>
                  )}
                </div>

                {product.description && (
                  <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Brand</p>
                    <p className="text-slate-800 mt-0.5">{product.brand?.name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Categories</p>
                    <p className="text-slate-800 mt-0.5">
                      {product.categories.map((c) => c.category.name).join(', ') || '—'}
                    </p>
                  </div>
                  {!product.hasVariants && (
                    <>
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide">SKU</p>
                        <p className="text-slate-800 mt-0.5">{product.sku}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Stock</p>
                        <p className="text-slate-800 mt-0.5">{product.stock}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* ---- Variants table ---- */}
                {product.hasVariants && product.variants.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Variants</p>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium">Variant</th>
                            <th className="text-left px-3 py-2 font-medium">SKU</th>
                            <th className="text-left px-3 py-2 font-medium">Price</th>
                            <th className="text-left px-3 py-2 font-medium">Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {product.variants.map((v) => (
                            <tr key={v.id} className="border-t border-slate-100">
                              <td className="px-3 py-2 text-slate-700">
                                {v.attributes.map((a) => a.attributeValue.value).join(' / ') || '—'}
                              </td>
                              <td className="px-3 py-2 text-slate-600">{v.sku}</td>
                              <td className="px-3 py-2 text-slate-800">
                                {v.salePrice ? (
                                  <>
                                    <span className="line-through text-slate-400 mr-1">${v.price}</span>
                                    <span>${v.salePrice}</span>
                                  </>
                                ) : (
                                  `$${v.price}`
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-600">{v.stock}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}