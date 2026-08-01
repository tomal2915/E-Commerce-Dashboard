// src/app/(dashboard)/users/page.tsx
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { getErrorMessage } from "@/lib/apiError";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  TableSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/shared/DataStates";
import { TablePagination } from "@/components/shared/TablePagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  isActive: boolean;
  role: { id: string; name: string };
}
interface Role {
  id: string;
  name: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    totalPages: 1,
    limit: 10,
  });
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roles, setRoles] = useState<Role[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const { toast } = useToast();

  async function loadUsers() {
    setError("");
    setUsers(null);
    try {
      const res = await api.get("/users", {
        params: {
          page,
          limit: 10,
          search: search || undefined,
          roleId: roleFilter === "all" ? undefined : roleFilter,
          isActive: statusFilter === "all" ? undefined : statusFilter,
        },
      });
      // Backend now returns { data: [...], meta: {...} }
      setUsers(res.data.data.data);
      setMeta(res.data.data.meta);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    api
      .get("/roles")
      .then((res) => setRoles(res.data.data.data ?? res.data.data));
  }, []);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      loadUsers();
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleToggleActive(user: UserRow) {
    try {
      await api.put(`/users/${user.id}`, { isActive: !user.isActive });
      toast({ title: `User ${user.isActive ? "deactivated" : "activated"}` });
      loadUsers();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: getErrorMessage(err),
      });
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-semibold">User</h1>
          <p className="text-sm text-muted-foreground">User</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-56"
          />
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              setEditingUser(null);
              setModalOpen(true);
            }}
          >
            + New
          </Button>
        </div>
      </div>

      {users === null && !error && <TableSkeleton />}
      {error && <ErrorState message={error} onRetry={loadUsers} />}
      {users && users.length === 0 && <EmptyState title="No users found" />}

      {users && users.length > 0 && (
        <div className="border rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox />
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user, i) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {(meta.page - 1) * meta.limit + i + 1}
                  </TableCell>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{user.role.name}</Badge>
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {user.gender ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={user.isActive}
                      onCheckedChange={() => handleToggleActive(user)}
                    />
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit"
                      onClick={() => {
                        setEditingUser(user);
                        setModalOpen(true);
                      }}
                    >
                      ✎
                    </Button>
                    <Button variant="ghost" size="icon" title="View">
                      👁
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      className="text-destructive"
                    >
                      🗑
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            page={meta.page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      <UserFormModal
        open={modalOpen}
        user={editingUser}
        roles={roles}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          loadUsers();
        }}
      />
    </div>
  );
}

function UserFormModal({
  open,
  user,
  roles,
  onClose,
  onSaved,
}: {
  open: boolean;
  user: UserRow | null;
  roles: Role[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user: currentUser } = useAuth();
  const isEditing = !!user;
  const isEditingSelf = currentUser?.id === user?.id;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [roleId, setRoleId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPassword("");
    setPhone(user?.phone ?? "");
    setGender(user?.gender ?? "");
    setRoleId(user?.role.id ?? "");
    setIsActive(user?.isActive ?? true);
    setError("");
  }, [open, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      if (isEditing) {
        await api.put(`/users/${user!.id}`, {
          name,
          roleId,
          isActive,
          phone,
          gender,
        });
      } else {
        await api.post("/users", {
          name,
          email,
          password,
          roleId,
          phone,
          gender,
        });
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit User" : "New User"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          {!isEditing && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select
                value={gender || ""}
                onValueChange={(value) => setGender(value || "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={roleId}
                onValueChange={(value) => setRoleId(value || "")}
                disabled={isEditingSelf}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEditingSelf && (
                <p className="text-xs text-muted-foreground">
                  You cannot change your own role.
                </p>
              )}
            </div>
          </div>
          {isEditing && (
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Active</Label>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
