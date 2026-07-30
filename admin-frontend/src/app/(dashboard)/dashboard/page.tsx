// src/app/(dashboard)/dashboard/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, FolderTree, Tags, Users } from 'lucide-react';

interface Stats { products: number; categories: number; brands: number; users: number; }

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    // Pulls counts from the existing list endpoints' pagination meta —
    // no dedicated /stats endpoint needed yet.
    Promise.all([
      api.get('/products', { params: { page: 1, limit: 1 } }),
      api.get('/categories'),
      api.get('/brands'),
      api.get('/users'),
    ]).then(([products, categories, brands, users]) => {
      setStats({
        products: products.data.data.meta.total,
        categories: categories.data.data.length,
        brands: brands.data.data.length,
        users: users.data.data.length,
      });
    });
  }, []);

  const cards = [
    { label: 'Products', value: stats?.products, icon: Package },
    { label: 'Categories', value: stats?.categories, icon: FolderTree },
    { label: 'Brands', value: stats?.brands, icon: Tags },
    { label: 'Users', value: stats?.users, icon: Users },
  ];

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-1">Welcome back, {user?.name}</h1>
      <p className="text-sm text-muted-foreground mb-6">{user?.role.name} · {user?.email}</p>

      <div className="grid grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="text-2xl font-bold">{c.value}</div>
              ) : (
                <Skeleton className="h-8 w-16" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}