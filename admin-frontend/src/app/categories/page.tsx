// src/app/categories/page.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { useToast } from "@/components/ToastProvider";
import { getErrorMessage } from "@/lib/apiError";
import { LoadingState, EmptyState, ErrorState } from "@/components/DataState";
import { Sidebar } from "@/components/layout/Sidebar";
import { CategoryFormModal } from "@/components/CategoryFormModal";

interface CategoryNode {
  id: string;
  name: string;
  activeFlag: boolean;
  sortOrder: number;
  children: CategoryNode[];
}

export default function CategoriesPage() {
  const [tree, setTree] = useState<CategoryNode[] | null>(null);
  const [error, setError] = useState("");
  const [editingCategory, setEditingCategory] = useState<CategoryNode | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const { showToast } = useToast();

  async function loadTree() {
    setError("");
    setTree(null);
    try {
      const res = await api.get("/categories/tree");
      setTree(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadTree();
  }, []);

  function renderNode(node: CategoryNode, depth = 0) {
    return (
      <div key={node.id}>
        <div
          className="flex items-center justify-between py-2 border-b border-slate-100 hover:bg-slate-50 px-2 rounded"
          style={{ paddingLeft: depth * 20 + 8 }}
        >
          <div className="flex items-center gap-2 text-sm">
            <span
              className={node.activeFlag ? "text-slate-800" : "text-slate-400"}
            >
              {node.name}
            </span>
            {!node.activeFlag && (
              <span className="text-xs bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">
                Inactive
              </span>
            )}
          </div>
          <button
            onClick={() => setEditingCategory(node)}
            className="text-xs text-slate-500 hover:underline"
          >
            Edit
          </button>
        </div>
        {node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-8 bg-slate-50 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Categories</h1>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            + New Category
          </button>
        </div>

        {tree === null && !error && (
          <LoadingState label="Loading categories..." />
        )}
        {error && <ErrorState message={error} onRetry={loadTree} />}
        {tree && tree.length === 0 && <EmptyState label="No categories yet" />}

        {tree && tree.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            {tree.map((node) => renderNode(node))}
          </div>
        )}

        {(isCreating || editingCategory) && (
          <CategoryFormModal
            category={editingCategory}
            onClose={() => {
              setIsCreating(false);
              setEditingCategory(null);
            }}
            onSaved={() => {
              setIsCreating(false);
              setEditingCategory(null);
              loadTree();
            }}
          />
        )}
      </main>
    </div>
  );
}
