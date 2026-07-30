// src/app/roles/page.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { ProtectedLayout } from "@/components/ProtectedLayout";

interface Role {
  id: string;
  name: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/roles")
      .then((res) => setRoles(res.data.data || res.data))
      .catch((err) => setError("Failed to fetch application roles."));
  }, []);

  return (
    <ProtectedLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Roles & Permissions Management</h1>
        {error && <div className="p-3 mb-4 text-red-500 bg-red-50 rounded">{error}</div>}
        
        <div className="bg-white rounded-lg shadow p-6">
          <ul className="divide-y divide-gray-200">
            {roles.map((role) => (
              <li key={role.id} className="py-3 flex justify-between items-center">
                <span className="font-medium">{role.name}</span>
              </li>
            ))}
            {roles.length === 0 && !error && <p className="text-gray-500">No roles configured.</p>}
          </ul>
        </div>
      </div>
    </ProtectedLayout>
  );
}
