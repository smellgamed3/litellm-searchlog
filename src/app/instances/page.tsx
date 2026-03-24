"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Edit2, Server, Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { LiteLLMInstancePublic } from "@/types";

interface FormData {
  name: string;
  baseUrl: string;
  adminKey: string;
}

const emptyForm: FormData = { name: "", baseUrl: "", adminKey: "" };

export default function InstancesPage() {
  const [instances, setInstances] = useState<LiteLLMInstancePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<FormData>(emptyForm);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<FormData>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchInstances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/instances");
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      const data: LiteLLMInstancePublic[] = await res.json();
      setInstances(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  const handleAdd = async () => {
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await fetch("/api/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add instance");
      }
      setAddOpen(false);
      setAddForm(emptyForm);
      await fetchInstances();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editId) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const body: Partial<FormData> = { name: editForm.name, baseUrl: editForm.baseUrl };
      if (editForm.adminKey) body.adminKey = editForm.adminKey;
      const res = await fetch(`/api/instances/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update instance");
      }
      setEditOpen(false);
      await fetchInstances();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await fetch(`/api/instances/${deleteId}`, { method: "DELETE" });
      setDeleteOpen(false);
      setDeleteId(null);
      await fetchInstances();
    } catch {
      // ignore
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEdit = (inst: LiteLLMInstancePublic) => {
    setEditId(inst.id);
    setEditForm({ name: inst.name, baseUrl: inst.baseUrl, adminKey: "" });
    setEditError(null);
    setEditOpen(true);
  };

  const openDelete = (id: string) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">LiteLLM Instances</h1>
          <p className="text-muted-foreground mt-1">
            Manage your LiteLLM Proxy connections. Admin keys are stored securely on the server.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Instance
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add LiteLLM Instance</DialogTitle>
              <DialogDescription>
                Connect to a LiteLLM Proxy instance by providing its URL and admin API key.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="add-name">Name</Label>
                <Input
                  id="add-name"
                  placeholder="My LiteLLM Proxy"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-url">Base URL</Label>
                <Input
                  id="add-url"
                  placeholder="https://your-litellm-proxy.example.com"
                  value={addForm.baseUrl}
                  onChange={(e) => setAddForm({ ...addForm, baseUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-key">Admin API Key</Label>
                <Input
                  id="add-key"
                  type="password"
                  placeholder="sk-..."
                  value={addForm.adminKey}
                  onChange={(e) => setAddForm({ ...addForm, adminKey: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  The key is stored server-side and never exposed to the browser.
                </p>
              </div>
              {addError && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <XCircle className="h-4 w-4" />
                  {addError}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={addLoading || !addForm.name || !addForm.baseUrl || !addForm.adminKey}
              >
                {addLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Instance
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-2 pt-6 text-destructive">
            <XCircle className="h-5 w-5" />
            <span>{error}</span>
          </CardContent>
        </Card>
      ) : instances.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Server className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No instances configured</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Add your first LiteLLM Proxy instance to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {instances.map((inst) => (
            <Card key={inst.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{inst.name}</CardTitle>
                  </div>
                  <Badge variant="secondary">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Configured
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Base URL
                  </p>
                  <p className="text-sm font-mono truncate" title={inst.baseUrl}>
                    {inst.baseUrl}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Admin Key
                  </p>
                  <p className="text-sm font-mono text-muted-foreground">
                    {inst.adminKeyMasked}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Added
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(inst.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEdit(inst)}
                  >
                    <Edit2 className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => openDelete(inst.id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Instance</DialogTitle>
            <DialogDescription>
              Update the instance configuration. Leave Admin Key blank to keep existing key.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-url">Base URL</Label>
              <Input
                id="edit-url"
                value={editForm.baseUrl}
                onChange={(e) => setEditForm({ ...editForm, baseUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-key">New Admin API Key (optional)</Label>
              <Input
                id="edit-key"
                type="password"
                placeholder="Leave blank to keep current key"
                value={editForm.adminKey}
                onChange={(e) => setEditForm({ ...editForm, adminKey: e.target.value })}
              />
            </div>
            {editError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <XCircle className="h-4 w-4" />
                {editError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={editLoading || !editForm.name || !editForm.baseUrl}
            >
              {editLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Instance</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this instance? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
