// src/app/products/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/axios';
import { getErrorMessage } from '@/lib/apiError';
import { LoadingState, EmptyState, ErrorState } from '@/components/DataState';
import { Sidebar } from '@/components/Sidebar';

interface ProductRow {
  id: string;
  name: string;
  status: boolean;
  brand: { name: string } | null;
  categories: { category: { name: string } }[];
  media: { mediaId: string }[];
  priceInfo: { minPrice: number; maxPrice: number };
  stock?: number;
}
interface CategoryOption {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[] | null>(null);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data.data));
  }, []);

  async function loadProducts() {
    setError('');
    setProducts(null);
    try {
      const res = await api.get('/products', {
        params: { page, limit: 20, search: search || undefined, categoryId: categoryId || undefined },
      });
      setProducts(res.data.data.data);
      setMeta(res.data.data.meta);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Reload whenever filters or page change — always via the API, never client-side filtering
  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, categoryId]);

  // Debounce search so we don't fire a request on every keystroke
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      loadProducts();
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-8 bg-slate-50 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Products</h1>
          <Link
            href="/products/new"
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            + New Product
          </Link>
        </div>

        <div className="flex gap-3 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {products === null && !error && <LoadingState label="Loading products..." />}
        {error && <ErrorState message={error} onRetry={loadProducts} />}
        {products && products.length === 0 && <EmptyState label="No products match your filters" />}

        {products && products.length > 0 && (
          <>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Product</th>
                    <th className="text-left px-4 py-2 font-medium">Brand</th>
                    <th className="text-left px-4 py-2 font-medium">Categories</th>
                    <th className="text-left px-4 py-2 font-medium">Price</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex-shrink-0" />
                        <Link
                          href={`/products/${product.id}`}
                          className="font-medium text-slate-800 hover:underline"
                        >
                          {product.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{product.brand?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {product.categories.map((c) => c.category.name).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        {product.priceInfo.minPrice === product.priceInfo.maxPrice
                          ? `$${product.priceInfo.minPrice}`
                          : `$${product.priceInfo.minPrice} - $${product.priceInfo.maxPrice}`}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-md ${
                            product.status
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {product.status ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-4 text-sm text-slate-600">
              <span>
                Page {meta.page} of {meta.totalPages} ({meta.total} total)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}