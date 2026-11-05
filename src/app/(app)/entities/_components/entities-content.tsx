'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { EntityType, AlertEntityType } from '../../alerts/types';

const ENTITY_TYPES: { value: EntityType; label: string }[] = [
  { value: 'COMPANY', label: 'Company' },
  { value: 'SITE', label: 'Site' },
  { value: 'ASSET', label: 'Asset' },
  { value: 'PROJECT', label: 'Project' },
  { value: 'OTHER', label: 'Other' },
];

export interface EntitiesContentProps {
  user: { id: string; name: string; email: string; role: string };
}

export function EntitiesContent({ user }: EntitiesContentProps) {
  const [entities, setEntities] = useState<AlertEntityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingEntity, setEditingEntity] = useState<AlertEntityType | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<AlertEntityType | null>(null);
  const [search, setSearch] = useState('');

  const isManager = user.role === 'SUPER_ADMIN' || user.role === 'MANAGER';

  const [formData, setFormData] = useState({
    name: '',
    type: 'COMPANY' as EntityType,
    jurisdiction: '',
    isActive: true,
  });

  useEffect(() => {
    fetchEntities();
  }, []);

  const fetchEntities = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/entities');
      if (res.ok) {
        const data = await res.json();
        setEntities(data.entities || data || []);
      }
    } catch (error) {
      toast.error('Failed to load entities');
    } finally {
      setLoading(false);
    }
  };

  const filteredEntities = entities.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.jurisdiction?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const newEntity = await res.json();
        setEntities((prev) => [newEntity, ...prev]);
        toast.success('Entity created');
        setShowDialog(false);
        setFormData({ name: '', type: 'COMPANY', jurisdiction: '', isActive: true });
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create entity');
      }
    } catch (error) {
      toast.error('Failed to create entity');
    }
  };

  const handleUpdate = async () => {
    if (!editingEntity) return;

    try {
      const res = await fetch(`/api/entities/${editingEntity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const updated = await res.json();
        setEntities((prev) =>
          prev.map((e) => (e.id === editingEntity.id ? updated : e))
        );
        toast.success('Entity updated');
        setShowDialog(false);
        setEditingEntity(null);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update entity');
      }
    } catch (error) {
      toast.error('Failed to update entity');
    }
  };

  const handleDelete = async (entity: AlertEntityType) => {
    try {
      const res = await fetch(`/api/entities/${entity.id}`, { method: 'DELETE' });
      if (res.ok) {
        setEntities((prev) => prev.filter((e) => e.id !== entity.id));
        toast.success('Entity deleted');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to delete entity');
      }
    } catch (error) {
      toast.error('Failed to delete entity');
    } finally {
      setShowDeleteDialog(false);
      setEntityToDelete(null);
    }
  };

  const openEditDialog = (entity: AlertEntityType) => {
    setEditingEntity(entity);
    setFormData({
      name: entity.name,
      type: entity.type,
      jurisdiction: entity.jurisdiction || '',
      isActive: entity.isActive,
    });
    setShowDialog(true);
  };

  const openCreateDialog = () => {
    setEditingEntity(null);
    setFormData({ name: '', type: 'COMPANY', jurisdiction: '', isActive: true });
    setShowDialog(true);
  };

  return (
    <div className="flex-1">
            <main className="max-w-7xl mx-auto w-full py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Entities</h1>
            <p className="text-muted-foreground">
              Manage entities for alert assignment and tracking
            </p>
          </div>
          {isManager && (
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Entity
            </Button>
          )}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEntities.length > 0 ? (
              filteredEntities.map((entity) => (
                <Card key={entity.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <h3 className="font-medium">{entity.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {ENTITY_TYPES.find((t) => t.value === entity.type)?.label || entity.type}
                            </Badge>
                            {entity.jurisdiction && <span>{entity.jurisdiction}</span>}
                          </div>
                        </div>
                        {!entity.isActive && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      {isManager && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(entity)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEntityToDelete(entity);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No entities found</p>
                {isManager && (
                  <Button variant="link" onClick={openCreateDialog}>
                    Create first entity
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEntity ? 'Edit Entity' : 'New Entity'}</DialogTitle>
              <DialogDescription>
                {editingEntity ? 'Update entity details' : 'Create a new entity'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, type: v as EntityType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Jurisdiction</Label>
                <Input
                  value={formData.jurisdiction}
                  onChange={(e) => setFormData((prev) => ({ ...prev, jurisdiction: e.target.value }))}
                  placeholder="e.g., Delaware"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: !!checked }))}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={editingEntity ? handleUpdate : handleCreate}>
                {editingEntity ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Entity</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{entityToDelete?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={() => entityToDelete && handleDelete(entityToDelete)}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}


