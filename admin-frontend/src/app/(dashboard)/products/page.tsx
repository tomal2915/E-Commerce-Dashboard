// src/app/(dashboard)/products/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/axios";
import { getErrorMessage } from "@/lib/apiError";
import {
  TableSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/shared/DataStates";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProductRow {
  id: string;
  name: string;
  status: boolean;
  brand: { name: string } | null;
  categories: { category: { name: string } }[];
  priceInfo: { minPrice: number; maxPrice: number };
}
interface CategoryOption {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[] | null>(null);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    api.get("/categories").then((res) => setCategories(res.data.data));
  }, []);

  async function loadProducts() {
    setError("");
    setProducts(null);
    try {
      const res = await api.get("/products", {
        params: {
          page,
          limit: 20,
          search: search || undefined,
          categoryId: categoryId || undefined,
        },
      });
      setProducts(res.data.data.data);
      setMeta(res.data.data.meta);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, categoryId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      loadProducts();
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">Products</h1>
        <Button asChild>
          <Link href="/products/add-new-products">+ New Product</Link>
        </Button>
      </div>

      <div className="flex gap-3 mb-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="max-w-xs"
        />
      </div>

      {products === null && !error && <TableSkeleton />}
      {error && <ErrorState message={error} onRetry={loadProducts} />}
      {products && products.length === 0 && (
        <EmptyState title="No products match your filters" />
      )}

      {products && products.length > 0 && (
        <>
          <div className="border rounded-xl bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Link
                        href={`/products/${product.id}`}
                        className="font-medium hover:underline"
                      >
                        {product.name}
                      </Link>
                    </TableCell>
                    <TableCell>{product.brand?.name ?? "—"}</TableCell>
                    <TableCell>
                      {product.categories
                        .map((c) => c.category.name)
                        .join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      {product.priceInfo.minPrice === product.priceInfo.maxPrice
                        ? `$${product.priceInfo.minPrice}`
                        : `$${product.priceInfo.minPrice} - $${product.priceInfo.maxPrice}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.status ? "default" : "secondary"}>
                        {product.status ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
            <span>
              Page {meta.page} of {meta.totalPages} ({meta.total} total)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
